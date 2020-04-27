import htmlEvents from '../view/htmlEvents'
import compiler from '../view/compiler'
import dataModel from '../data/model'
import context from '../context'

const MainComponents = {}


function ComponentModel (option) {
    // @ast 语法树
    // @actions 行为方法

    this._initView(option.template)
    this._initDataModel(option.datas)
    this._initActions(option.actions)

    // this._initActions(option.actions)
    // this._initBaseContext()
}
ComponentModel.prototype._initView = function (template) {
    this.ast = compiler(template)
    console.info(this.ast)
}
ComponentModel.prototype._initDataModel = function (datas) {
    this.dataModel = dataModel(datas)
}
ComponentModel.prototype._initActions = function (actions) {
    const thisActions = this.actions = {}
    for (const key in actions) {
        const action = actions[key]
        if (key in htmlEvents.globals) {
            htmlEvents.globals[key].call(this, action)
        } else {
            thisActions[key] = action
        }
    }
    if ('main' in thisActions) {
        this._initMain(thisActions.main)
        delete thisActions.main
    }
}
ComponentModel.prototype._initMain = function (main) {
    const component = new Component(this, {
        parentVNode: {
            dom: null,
            context: context(),
        },
    })
    MainComponents[component.uid] = component
    htmlEvents.globals.domready.call(component, main)
}

const ComponentState = { listening: 0, dataUpdating: 1, domRepaint: 2 }

let ComponentUid = 0
function Component (model, option) {
    this.uid = ComponentUid++
    this.model = model
    this.parentVNode = option.parentVNode
    this.context = this.parentVNode.context.inherit(this)
    this.VNode = this.model.ast.createVNode(this.context, this.parentVNode)
}
Component.prototype.defaultDatas = function () { // 获取组件默认的数据
    return this.model.dataModel.getDefaultValue(this)
}
Component.prototype.mount = function (element) {
    this.VNode.parent.dom = element
    this.VNode.dispatch()
    this.state = ComponentState.listening
}
Component.prototype.dateUpdate = function (dataNodes) {
    if (this.state === ComponentState.listening) {
        this.state = ComponentState.dataUpdating
        this.domRepaintTimer = setTimeout(() => { // 等待dom更新
            this.dataCommit()
            this.domRepaint()
        })
        this.updateDataNodes = []
    }
    this.VNode.dataUpdate() // 更新虚拟节点数据
    this.updateDataNodes = this.updateDataNodes.concat(dataNodes) // 用于数据回退
}
Component.prototype.dataCommit = function () {
    const dataNodes = this.updateDataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        dataNodes[i].commit()
    }
}
Component.prototype.dataRollback = function () {
    const dataNodes = this.updateDataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        dataNodes[i].rollback()
    }
}

Component.prototype.domRepaint = function () {
    this.state = ComponentState.domRepaint
    this.VNode.dispatch()
    this.state = ComponentState.listening
    //  console.info('domReady')
}


export default function (option) {
    return new ComponentModel(option)
}
