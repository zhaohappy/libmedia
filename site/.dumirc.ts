import { defineConfig } from 'dumi';
import path from 'path';

export default defineConfig({
  plugins: ['@umijs/plugins/dist/tailwindcss'],
  tailwindcss: {},
  alias: {
    '@libmedia/avcodec': path.resolve(__dirname, '../packages/avcodec'),
    '@libmedia/avformat': path.resolve(__dirname, '../packages/avformat'),
    '@libmedia/avnetwork': path.resolve(__dirname, '../packages/avnetwork'),
    '@libmedia/avprotocol': path.resolve(__dirname, '../packages/avprotocol'),
    '@libmedia/avrender': path.resolve(__dirname, '../packages/avrender'),
    '@libmedia/audiostretchpitch': path.resolve(__dirname, '../packages/audiostretchpitch'),
    '@libmedia/audioresample': path.resolve(__dirname, '../packages/audioresample'),
    '@libmedia/avpipeline': path.resolve(__dirname, '../packages/avpipeline'),
    '@libmedia/avutil': path.resolve(__dirname, '../packages/avutil'),
    '@libmedia/videoscale': path.resolve(__dirname, '../packages/videoscale'),
    '@libmedia/avfilter': path.resolve(__dirname, '../packages/avfilter'),
    '@libmedia/cheap': path.resolve(__dirname, '../packages/cheap/'),
    '@libmedia/common': path.resolve(__dirname, '../packages/common')
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
