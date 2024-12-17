// 禁用源码下方的 CSB 按钮

// @ts-nocheck
import Previewer from 'dumi/theme-default/builtins/Previewer';
import React from 'react';
export default (props) => {
  return <Previewer {...props} disabledActions={['CSB']} />;
};
