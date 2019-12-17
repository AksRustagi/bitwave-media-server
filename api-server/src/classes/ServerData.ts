// Created by xander on 12/16/2019

import logger from './Logger';
const log = logger('SDATA');

import { ffprobe } from 'fluent-ffmpeg';

interface IResolution {
  width: number,
  height: number,
}

interface IVideoStats {
  codec: string,
  bitrate: string,
  fps: string,
  keyframes: number,
  resolution: IResolution,
}

interface IAudioStats {
  codec: string,
  bitrate: string,
}

interface IStreamerData {
  name: string,
  timestamp: number,
  video: IVideoStats[],
  audio: IAudioStats[],
}

class ServerData {
  private streamers: Map<string, IStreamerData>;

  constructor() {
    this.streamers = new Map();
  }

  addStreamer ( streamer: string ): void {

    const streamerData: IStreamerData = {
      name: streamer,
      timestamp: Date.now(),
      video: [],
      audio: [],
    };

    this.streamers.set( streamer, streamerData );

    // Probe input stream
    const endpoint = `rtmp://nginx-server/live/${streamer}`;
    try {
      ffprobe(endpoint, (err, data) => {
        if ( err ) {
          log.error( err );
          return;
        }

        log.info( JSON.stringify( data ) );

        const streams = data.streams;

        const videoStream = streams.filter(stream => stream.codec_type === 'video');
        const audioStream = streams.filter(stream => stream.codec_type === 'audio');

        this.updateStreamerData( streamer, videoStream, audioStream );
      });
    } catch ( error ) {
      log.error( error );
    }
  }

  private updateStreamerData ( streamer: string, videoStream: any[], audioStream: any[] ): void {
    let data = this.streamers.get( streamer );

    if ( videoStream ) {
      log.info( JSON.stringify( videoStream ) );
      videoStream.forEach( vs => {
        data.video.push({
          codec: vs.codec_name,
          bitrate: vs.bit_rate,
          fps: vs.avg_frame_rate,
          keyframes: vs.has_b_frames,
          resolution: {
            width: vs.width,
            height: vs.height,
          }
        });
      });

    }

    if ( audioStream ) {
      log.info( JSON.stringify( audioStream ) );
      audioStream.forEach( as => {
        data.audio.push({
          codec: as.codec_name,
          bitrate: as.bit_rate,
        });
      });
    }

    this.streamers.set( streamer, data );
  }

  removeStreamer ( streamer: string ): void {
    this.streamers.delete( streamer );
  }

  getStreamerList (): string[] {
    return Array.from( this.streamers.keys() );
  }

  getStreamerData ( streamer: string ): IStreamerData|null {
    if ( !this.streamers.has( streamer ) ) return null;
    return this.streamers.get( streamer );
  }
}

export const serverData = new ServerData();
