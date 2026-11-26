// In-process video encoder for render.mjs: converts the changed part of a canvas to YUV and hands frames to
// libavcodec (h264_vaapi on the GPU, or libx264), with no ffmpeg process and no pipe in between.
//   open(encoder, w, h, fps, device, "key=value:key=value")  -> handle
//   convert(handle, rgba, x0, x1)   rgba: the canvas pixels; x0/x1: Int32Array per band of 8 rows, the columns to convert
//   encode(handle, key)             send the frame (key: start a new stream segment with an IDR); -> packets ready so far
//   flush(handle)                   -> the remaining packets
//   planes(handle)                  -> a copy of the YUV frame as it stands (for tests)
// Packets come out in frame order, one per frame, as Annex B.
#define NAPI_VERSION 8
#include <node_api.h>
#include <stdint.h>
#include <string.h>
#include <libavcodec/avcodec.h>
#include <libavutil/hwcontext.h>
#include <libavutil/dict.h>

typedef struct { AVCodecContext *c; AVBufferRef *dev, *frames; AVFrame *sw; AVPacket *pkt; uint8_t *mem; int w, h, hw; int64_t pts; } Enc;

static napi_value fail(napi_env env, const char *what, int err) {
  char msg[256], e[128] = ""; if (err) av_strerror(err, e, sizeof e);
  snprintf(msg, sizeof msg, "%s%s%s", what, err ? ": " : "", e); napi_throw_error(env, NULL, msg); return NULL;
}
static void nofree(void *o, uint8_t *d) { (void)o; (void)d; }
static void destroy(Enc *e) {
  if (!e) return;
  avcodec_free_context(&e->c); av_frame_free(&e->sw); av_packet_free(&e->pkt); av_buffer_unref(&e->frames); av_buffer_unref(&e->dev); av_free(e->mem); free(e);
}
static void finalize(napi_env env, void *data, void *hint) { (void)env; (void)hint; destroy(data); }

static napi_value Open(napi_env env, napi_callback_info info) {
  size_t argc = 6; napi_value a[6]; napi_get_cb_info(env, info, &argc, a, NULL, NULL);
  char name[64], device[256], opts[1024]; size_t n; int32_t w, h, fps;
  napi_get_value_string_utf8(env, a[0], name, sizeof name, &n); napi_get_value_int32(env, a[1], &w); napi_get_value_int32(env, a[2], &h);
  napi_get_value_int32(env, a[3], &fps); napi_get_value_string_utf8(env, a[4], device, sizeof device, &n); napi_get_value_string_utf8(env, a[5], opts, sizeof opts, &n);
  av_log_set_level(AV_LOG_ERROR);
  const AVCodec *codec = avcodec_find_encoder_by_name(name); if (!codec) return fail(env, "encoder not found", 0);
  Enc *e = calloc(1, sizeof *e); e->w = w; e->h = h; e->hw = strstr(name, "vaapi") != NULL; int r;
  e->mem = av_malloc((size_t)w * h * 3 / 2 + 64); memset(e->mem, 0, (size_t)w * h * 3 / 2);
  e->sw = av_frame_alloc(); e->pkt = av_packet_alloc(); e->sw->width = w; e->sw->height = h;
  e->sw->data[0] = e->mem; e->sw->linesize[0] = w; e->sw->data[1] = e->mem + w * h;
  if (e->hw) { e->sw->format = AV_PIX_FMT_NV12; e->sw->linesize[1] = w; }
  else {
    e->sw->format = AV_PIX_FMT_YUV420P; e->sw->linesize[1] = e->sw->linesize[2] = w / 2; e->sw->data[2] = e->mem + w * h + (w / 2) * (h / 2);
    e->sw->buf[0] = av_buffer_create(e->mem, (size_t)w * h * 3 / 2, nofree, NULL, 0);
  }
  AVCodecContext *c = e->c = avcodec_alloc_context3(codec);
  c->width = w; c->height = h; c->time_base = (AVRational){ 1, fps }; c->framerate = (AVRational){ fps, 1 }; c->max_b_frames = 0; c->gop_size = 1 << 20;
  if (e->hw) {
    if ((r = av_hwdevice_ctx_create(&e->dev, AV_HWDEVICE_TYPE_VAAPI, device[0] ? device : NULL, NULL, 0)) < 0) { destroy(e); return fail(env, "cannot open the VAAPI device", r); }
    e->frames = av_hwframe_ctx_alloc(e->dev); AVHWFramesContext *fc = (AVHWFramesContext *)e->frames->data;
    fc->format = AV_PIX_FMT_VAAPI; fc->sw_format = AV_PIX_FMT_NV12; fc->width = w; fc->height = h; fc->initial_pool_size = 24;
    if ((r = av_hwframe_ctx_init(e->frames)) < 0) { destroy(e); return fail(env, "cannot create GPU frames", r); }
    c->pix_fmt = AV_PIX_FMT_VAAPI; c->hw_frames_ctx = av_buffer_ref(e->frames);
  } else c->pix_fmt = AV_PIX_FMT_YUV420P;
  AVDictionary *d = NULL; av_dict_parse_string(&d, opts, "=", ":", 0);
  r = avcodec_open2(c, codec, &d); av_dict_free(&d);
  if (r < 0) { destroy(e); return fail(env, "cannot open the encoder", r); }
  napi_value out; napi_create_external(env, e, finalize, NULL, &out); return out;
}

// BT.601 limited range, chroma from 2x2 averages: the same integer arithmetic as yuv.mjs.
static void rows(Enc *e, const uint8_t *px, int y0, int y1, int x0, int x1) {
  const int w = e->w, cw = w / 2; uint8_t *Y = e->mem, *C = e->mem + w * e->h;
  for (int y = y0; y < y1; y++) {
    const uint8_t *s = px + ((size_t)y * w + x0) * 4; uint8_t *o = Y + (size_t)y * w + x0;
    for (int x = 0; x < x1 - x0; x++) o[x] = (uint8_t)(((66 * s[4 * x] + 129 * s[4 * x + 1] + 25 * s[4 * x + 2] + 128) >> 8) + 16);
  }
  for (int y = y0; y < y1; y += 2) {
    const uint8_t *s = px + ((size_t)y * w + x0) * 4, *t = s + (size_t)w * 4;
    uint8_t *u, *v; int step;
    if (e->hw) { u = C + (size_t)(y / 2) * w + x0; v = u + 1; step = 2; } else { u = C + (size_t)(y / 2) * cw + x0 / 2; v = u + (size_t)cw * (e->h / 2); step = 1; }
    for (int x = 0; x < (x1 - x0) / 2; x++) {
      const int R = s[8 * x] + s[8 * x + 4] + t[8 * x] + t[8 * x + 4], G = s[8 * x + 1] + s[8 * x + 5] + t[8 * x + 1] + t[8 * x + 5], B = s[8 * x + 2] + s[8 * x + 6] + t[8 * x + 2] + t[8 * x + 6];
      u[x * step] = (uint8_t)(((-38 * R - 74 * G + 112 * B + 512) >> 10) + 128); v[x * step] = (uint8_t)(((112 * R - 94 * G - 18 * B + 512) >> 10) + 128);
    }
  }
}
static napi_value Convert(napi_env env, napi_callback_info info) {
  size_t argc = 4; napi_value a[4]; napi_get_cb_info(env, info, &argc, a, NULL, NULL);
  Enc *e; napi_get_value_external(env, a[0], (void **)&e);
  uint8_t *px; size_t len; napi_get_buffer_info(env, a[1], (void **)&px, &len);
  if (len < (size_t)e->w * e->h * 4) return fail(env, "the pixel buffer is too small", 0);
  int32_t *x0, *x1; size_t n0, n1; napi_typedarray_type t;
  napi_get_typedarray_info(env, a[2], &t, &n0, (void **)&x0, NULL, NULL); napi_get_typedarray_info(env, a[3], &t, &n1, (void **)&x1, NULL, NULL);
  for (size_t i = 0; i < n0 && i < n1; i++) {
    if (x1[i] <= x0[i]) continue;
    int y0 = (int)i * 8, y1 = y0 + 8 > e->h ? e->h : y0 + 8, a0 = x0[i] & ~1, a1 = (x1[i] + 1) & ~1; if (a0 < 0) a0 = 0; if (a1 > e->w) a1 = e->w;
    if (y0 < e->h && a1 > a0) rows(e, px, y0, y1, a0, a1);
  }
  return NULL;
}
static int drain(napi_env env, Enc *e, napi_value arr, uint32_t *n) {
  int r;
  while ((r = avcodec_receive_packet(e->c, e->pkt)) >= 0) {
    napi_value b; napi_create_buffer_copy(env, e->pkt->size, e->pkt->data, NULL, &b); napi_set_element(env, arr, (*n)++, b); av_packet_unref(e->pkt);
  }
  return r;
}
static napi_value Encode(napi_env env, napi_callback_info info) {
  size_t argc = 2; napi_value a[2]; napi_get_cb_info(env, info, &argc, a, NULL, NULL);
  Enc *e; napi_get_value_external(env, a[0], (void **)&e); bool key = false; napi_get_value_bool(env, a[1], &key);
  napi_value arr; napi_create_array(env, &arr); uint32_t n = 0; int r;
  AVFrame *f = e->sw;
  if (e->hw) {
    f = av_frame_alloc();
    if ((r = av_hwframe_get_buffer(e->frames, f, 0)) < 0 || (r = av_hwframe_transfer_data(f, e->sw, 0)) < 0) { av_frame_free(&f); return fail(env, "cannot upload the frame to the GPU", r); }
  }
  f->pts = e->pts++; f->pict_type = key ? AV_PICTURE_TYPE_I : AV_PICTURE_TYPE_NONE;
  r = avcodec_send_frame(e->c, f);
  if (r == AVERROR(EAGAIN)) { drain(env, e, arr, &n); r = avcodec_send_frame(e->c, f); }
  if (e->hw) av_frame_free(&f);
  if (r < 0) return fail(env, "the encoder refused a frame", r);
  r = drain(env, e, arr, &n);
  if (r != AVERROR(EAGAIN) && r != AVERROR_EOF) return fail(env, "encoding failed", r);
  return arr;
}
static napi_value Flush(napi_env env, napi_callback_info info) {
  size_t argc = 1; napi_value a[1]; napi_get_cb_info(env, info, &argc, a, NULL, NULL);
  Enc *e; napi_get_value_external(env, a[0], (void **)&e);
  napi_value arr; napi_create_array(env, &arr); uint32_t n = 0;
  avcodec_send_frame(e->c, NULL); int r = drain(env, e, arr, &n);
  if (r != AVERROR_EOF && r != AVERROR(EAGAIN)) return fail(env, "encoding failed", r);
  return arr;
}
// planes(handle) -> a copy of the YUV frame as it stands (for tests)
static napi_value Planes(napi_env env, napi_callback_info info) {
  size_t argc = 1; napi_value a[1]; napi_get_cb_info(env, info, &argc, a, NULL, NULL);
  Enc *e; napi_get_value_external(env, a[0], (void **)&e);
  napi_value b; napi_create_buffer_copy(env, (size_t)e->w * e->h * 3 / 2, e->mem, NULL, &b); return b;
}
static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor p[] = {
    { "open", NULL, Open, NULL, NULL, NULL, napi_default, NULL }, { "convert", NULL, Convert, NULL, NULL, NULL, napi_default, NULL },
    { "encode", NULL, Encode, NULL, NULL, NULL, napi_default, NULL }, { "flush", NULL, Flush, NULL, NULL, NULL, napi_default, NULL },
    { "planes", NULL, Planes, NULL, NULL, NULL, napi_default, NULL } };
  napi_define_properties(env, exports, 5, p); return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
