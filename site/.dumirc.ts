import { defineConfig } from 'dumi';
import path from 'path';

export default defineConfig({
  plugins: ['@umijs/plugins/dist/tailwindcss'],
  tailwindcss: {},
  alias: {
    '@libmedia/avcodec': path.resolve(__dirname, '../src/avcodec/'),
    '@libmedia/avformat': path.resolve(__dirname, '../src/avformat/'),
    '@libmedia/avnetwork': path.resolve(__dirname, '../src/avnetwork/'),
    '@libmedia/avplayer': path.resolve(__dirname, '../src/avplayer/'),
    '@libmedia/avprotocol': path.resolve(__dirname, '../src/avprotocol/'),
    '@libmedia/avrender': path.resolve(__dirname, '../src/avrender/'),
    '@libmedia/audiostretchpitch': path.resolve(__dirname, '../src/audiostretchpitch/'),
    '@libmedia/audioresample': path.resolve(__dirname, '../src/audioresample/'),
    '@libmedia/avpipeline': path.resolve(__dirname, '../src/avpipeline/'),
    '@libmedia/avtranscode': path.resolve(__dirname, '../src/avtranscode/'),
    '@libmedia/avutil': path.resolve(__dirname, '../src/avutil/'),
    '@libmedia/videoscale': path.resolve(__dirname, '../src/videoscale/'),
    '@libmedia/avfilter': path.resolve(__dirname, '../src/avfilter/'),

    '@libmedia/cheap': path.resolve(__dirname, '../src/cheap/'),
    '@libmedia/common': path.resolve(__dirname, '../src/common/'),

    'avcodec': path.resolve(__dirname, '../src/avcodec/'),
    'avformat': path.resolve(__dirname, '../src/avformat/'),
    'avnetwork': path.resolve(__dirname, '../src/avnetwork/'),
    'avplayer': path.resolve(__dirname, '../src/avplayer/'),
    'avprotocol': path.resolve(__dirname, '../src/avprotocol/'),
    'avrender': path.resolve(__dirname, '../src/avrender/'),
    'audiostretchpitch': path.resolve(__dirname, '../src/audiostretchpitch/'),
    'audioresample': path.resolve(__dirname, '../src/audioresample/'),
    'avpipeline': path.resolve(__dirname, '../src/avpipeline/'),
    'avtranscode': path.resolve(__dirname, '../src/avtranscode/'),
    'avutil': path.resolve(__dirname, '../src/avutil/'),
    'videoscale': path.resolve(__dirname, '../src/videoscale/'),
    'avfilter': path.resolve(__dirname, '../src/avfilter/'),

    'cheap': path.resolve(__dirname, '../src/cheap/'),
    'common': path.resolve(__dirname, '../src/common/')
  },

  analytics: { ga_v2: 'G-MC335K4KV6' },
  themeConfig: {
    name: 'libmedia',
    logo: false,
    hideHomeNav: true,
    socialLinks: {
      github: 'https://github.com/zhaohappy/libmedia',
    },
    footer: ' ',
    footerConfig: {
      bottom:
        '<div>碰到问题请去 <a href="https://github.com/zhaohappy/libmedia/issues" >libmedia Issues</a> 中反馈</div><div class="flex" style="justify-content: center;"><a href="https://github.com/zhaohappy/libmedia"><img src="https://img.shields.io/github/stars/zhaohappy/libmedia"></a></div><div>Copyright (c) 2024-present the libmedia developers</div>',
      copyright: ' ',
      columns: [],
    },
    apiHeader: false,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        base: '/',
        publicPath: '/',
      }
    : {
        base: '/libmedia/docs/',
        publicPath: '/libmedia/docs/',
      }),
  targets: { chrome: 102 },
  mfsu: true,
  legacy: { nodeModulesTransform: false },
  locales: [
    { id: 'zh-CN', name: '简体中文' },
    { id: 'en-US', name: 'English' },
  ],
});
