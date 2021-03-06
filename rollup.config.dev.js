import resolve from '@rollup/plugin-node-resolve'
import cjs from '@rollup/plugin-commonjs'
import buble from '@rollup/plugin-buble'
import json from '@rollup/plugin-json'
// import { terser } from 'rollup-plugin-terser'
import hotserve from 'rollup-plugin-hotserve'
import node from 'rollup-plugin-node-builtins'
import nodeGlobals from 'rollup-plugin-node-globals'

export default {
    input: './playground/index.js', // 入口文件
    output: { // 出口文件
        file: './temp/index.bundle.js',
        format: 'iife',
        name: 'playground',
        sourcemap: true,
    },
    plugins: [
        cjs(),
        resolve({
            // 将自定义选项传递给解析插件
            customResolveOptions: {
                moduleDirectory: 'node_modules',
            },
        }),
        json(),
        buble({
            objectAssign: 'object.assgin',
            transforms: {
                // asyncAwait: false
            },
        }),
        node(),
        nodeGlobals(),
        // terser(),
        hotserve({ // 使用开发服务插件
            port: 3001,
            // 设置 exmaple的访问目录和dist的访问目录
            contentBase: [ './playground', './temp' ],
            hotReload: /\\playground\\[^\\/]+\.js$/,
        }),
    ],
    // external: ['lodash']
}
