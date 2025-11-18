
/*
 * libmedia audio stretch and pitcher
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

#include "./soundtouch/include/SoundTouch.h"
#include "wasmenv.h"

static soundtouch::SoundTouch* st = nullptr;

EM_PORT_API(void) stretchpitch_init() {
  st = new soundtouch::SoundTouch();
}

EM_PORT_API(void) stretchpitch_set_channels(int channels) {
  st->setChannels(channels);
}

EM_PORT_API(void) stretchpitch_set_samplerate(int sampleRate) {
  st->setSampleRate(sampleRate);
}

EM_PORT_API(void) stretchpitch_set_rate(double rate) {
  st->setRate(rate);
}

EM_PORT_API(void) stretchpitch_set_rate_change(double change) {
  st->setRateChange(change);
}

EM_PORT_API(void) stretchpitch_set_tempo(double tempo) {
  st->setTempo(tempo);
}

EM_PORT_API(void) stretchpitch_set_tempo_change(double change) {
  st->setTempoChange(change);
}

EM_PORT_API(void) stretchpitch_set_pitch(double pitch) {
  st->setPitch(pitch);
}

EM_PORT_API(void) stretchpitch_set_pitch_octaves(double newPitch) {
  st->setPitchOctaves(newPitch);
}

EM_PORT_API(void) stretchpitch_set_pitch_semi_tones(double newPitch) {
  st->setPitchSemiTones(newPitch);
}

EM_PORT_API(void) stretchpitch_send_samples(float* input, int nSamples) {
  st->putSamples(input, nSamples);
}

EM_PORT_API(int) stretchpitch_receive_samples(float* output, int maxSamples) {
  return st->receiveSamples(output, maxSamples);
}

EM_PORT_API(void) stretchpitch_flush() {
  st->flush();
}

EM_PORT_API(void) stretchpitch_clear() {
  st->clear();
}

EM_PORT_API(int) stretchpitch_get_unprocessed_samples_num() {
  return st->numUnprocessedSamples();
}

EM_PORT_API(int) stretchpitch_get_input_output_sample_ratio() {
  return st->getInputOutputSampleRatio();
}

EM_PORT_API(int) get_latency() {
  return st->getSetting(SETTING_INITIAL_LATENCY);
}

EM_PORT_API(void) stretchpitch_destroy() {
  st->clear();
  delete st;
}

