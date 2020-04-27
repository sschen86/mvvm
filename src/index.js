import { version } from '../package.json'


import component from './component'
import view from './view'
import context from './context'
import types from './data/types'

const dva = (option) => dva.component(option)

dva.version = version
dva.component = component
dva.view = view
dva.context = context
dva.types = types

export default dva
