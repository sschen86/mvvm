import dataQuery from '../data/query'
import htmlEvents from '../view/htmlEvents'
const htmlSpaceChar = String.fromCharCode(160) // html空格实体符&nbsp;

const dispatchType = {
    CREATE: 0,
    MODIFY: 1,
    REMOVE: 2,
}

let VNodeUid = 0
function VNode (option) {
    this.uid = VNodeUid++
    this.astNode = option.astNode
    this.context = option.context
    this.parent = option.parent
    this.dispatchType = dispatchType.CREATE
    option.init.call(this)
}

// dom数据初始化
VNode.prototype.initTagNode = function () {
    this.isDom = true
    this.updates = {
        createDom: document.createElement(this.astNode.nodeName),
    }
}
VNode.prototype.initTextNode = function () {
    const { astNode, context } = this
    let nodeValue
    if (astNode.isSelfDynamic) {
        nodeValue = astNode.getNodeValue(context.getRootDatas(astNode.inheritDataKeys))
        nodeValue = typeof nodeValue === 'string' ? nodeValue.replace(/\s/g, htmlSpaceChar) : `${nodeValue}`
    } else {
        nodeValue = astNode.nodeValue
    }
    this.isDom = true
    this.updates = {
        createDom: document.createTextNode(nodeValue),
    }
    this.nodeValue = nodeValue
    // this.dom = document.createTextNode(nodeValue)
}
VNode.prototype.initAttributes = function () {
    const astNode = this.astNode
    const attributes = {}; let lg = 0
    const allAttributes = astNode.staticAttributes.concat(astNode.dynamicAttributes)
    for (let i = 0; i < allAttributes.length; i++) {
        const attribute = allAttributes[i]
        attributes[attribute.key] = attribute.getValue ? attribute.getValue(this.context.getRootDatas(astNode.inheritDataKeys)) : attribute.value
        lg++
        // console.info('创建节点属性', attribute.key +'='+ (attribute.getValue ? attribute.getValue(vnode.context.value()): attribute.value ) )
    }
    if (lg) {
        this.updates.createAttributes = attributes
    }
}
VNode.prototype.initEvents = function () {
    const events = this.astNode.events
    if (events.length) {
        const thisEvents = this.updates.createEvents = {}
        for (let i = 0; i < events.length; i++) {
            thisEvents[events[i].type] = events[i].listener
        }
        this.dispatchEvent = this.originDispatchEvent
    }
}
VNode.prototype.initChildNodes = function () {
    const astNodeChilds = this.astNode.childNodes
    const thisChilds = this.childNodes = []
    for (let i = 0; i < astNodeChilds.length; i++) {
        const astNodeChild = astNodeChilds[i]
        // console.info({astNodeChild})
        thisChilds.push(astNodeChild.createVNode(this.context, this))
    }
    this._initChildsLinkedList()
}
VNode.prototype.initCaseChildNodes = function () {
    const { astNode, context } = this
    const cases = astNode.cases
    const thisChilds = this.childNodes = []
    for (let i = 0; i < cases.length; i++) {
        const caseNode = cases[i]
        if (caseNode.isEnable(context.getRootDatas(astNode.inheritDataKeys))) {
            // console.info({caseNode})
            this.caseIndex = i
            thisChilds.push(caseNode.createVNode(this.context, this))
            break
        }
    }
    this._initChildsLinkedList()
}
VNode.prototype.initEachItemNodeChildNodes = function () {
    const astNodeChilds = this.parent.astNode.childNodes
    const thisChilds = this.childNodes = []
    for (let i = 0; i < astNodeChilds.length; i++) {
        const astNodeChild = astNodeChilds[i]
        // console.info({astNodeChild})
        thisChilds.push(astNodeChild.createVNode(this.context, this))
    }
    this._initChildsLinkedList()
}
VNode.prototype._initChildsLinkedList = function () { // 创建子节点链表索引
    const thisChilds = this.childNodes
    if (thisChilds.length === 0) {
        this.firstChild = this.lastChild = null
    } else {
        let head = {}; let tail = head; let vnode
        for (let i = 0; i < thisChilds.length; i++) {
            tail.nextSibling = vnode = thisChilds[i]
            vnode.previousSibling = tail
            tail = vnode
        }

        head = head.nextSibling
        head.previousSibling = null
        tail.nextSibling = null
        this.firstChild = head
        this.lastChild = tail
    }
}
VNode.prototype.initEachNode = function () {
    const { astNode, context } = this
    const originDataKey = astNode.originDataKey
    const eachDatas = context.getDataNode(originDataKey)
    // console.info(originDataKey, eachDatas, context)
    if (!eachDatas.isArray) {
        throw Error(`数据错误${originDataKey}`)
    }

    // console.info(astNode)

    const thisChilds = this.childNodes = []

    for (let i = 0; i < eachDatas.childNodes.length; i++) {
        thisChilds.push(astNode.itemCreateVNode(this, eachDatas.childNodes[i], i))
    }

    this._initChildsLinkedList()
}

// dom数据更新
VNode.prototype.dataUpdate = function () {
    this.astNode.modifyVNode(this)
}
VNode.prototype.modifyChildNodes = function () {
    const childNodes = this.childNodes
    if (childNodes) {
        for (let i = 0; i < childNodes.length; i++) {
            const vnode = childNodes[i]
            vnode.astNode.modifyVNode(vnode)
        }
    }
}
VNode.prototype.modifyAttributes = function () {
    const dynamicAttributes = this.astNode.dynamicAttributes
    if (dynamicAttributes.length) {
        const { astNode, context } = this
        const oldAttributes = this.attributes
        const modifyAttributes = {}; let isModify = false
        for (let i = 0; i < dynamicAttributes.length; i++) {
            const newAttribute = dynamicAttributes[i]
            const newValue = newAttribute.getValue(context.getRootDatas(astNode.inheritDataKeys))
            if (newValue !== oldAttributes[newAttribute.key]) {
                modifyAttributes[newAttribute.key] = newValue
                isModify = true
            }
        }
        if (isModify) {
            if (this.updates.modifyAttributes) {
                Object.assign(this.updates.modifyAttributes, modifyAttributes)
            } else {
                this.updates.modifyAttributes = modifyAttributes
            }
        }
    }
}
VNode.prototype.modifySwitchCase = function () {
    const { astNode, context } = this
    const cases = astNode.cases
    const oldCaseIndex = this.caseIndex
    let newCaseIndex = null
    for (let i = 0; i < cases.length; i++) {
        const caseNode = cases[i]
        if (caseNode.isEnable(context.getRootDatas(astNode.inheritDataKeys))) {
            newCaseIndex = i
            break
        }
    }
    if (oldCaseIndex !== newCaseIndex) { // switch逻辑的激活分支发生改变
        // console.info('modifySwitchCase', this)
        if (oldCaseIndex !== null) { // 删除旧节点
            this.childNodes.pop().removeCaseNode()
        }
        if (newCaseIndex !== null) { // 添加节点
            this.childNodes[0] = cases[newCaseIndex].createVNode(this.context, this)
        }
        this.caseIndex = newCaseIndex
        this._initChildsLinkedList()
    }
}
VNode.prototype.modifyNodeValue = function () {
    const { astNode, context } = this
    const oldNodeValue = this.nodeValue
    let newNodeValue = astNode.getNodeValue(context.getRootDatas(astNode.inheritDataKeys))
    newNodeValue = typeof newNodeValue === 'string' ? newNodeValue.replace(/\s/g, htmlSpaceChar) : `${newNodeValue}`
    if (oldNodeValue !== newNodeValue) {
        this.updates = this.updates || {}
        this.updates.modifyTextNode = { value: newNodeValue }
    }
}
VNode.prototype.modifyEachNode = function () {
    // console.info('modifyEachNode', this)

    const { astNode, context } = this
    const originDataKey = astNode.originDataKey
    const eachDatas = context.getDataNode(originDataKey)
    const newItemUidsMap = {}
    const newChildNodes = this.childNodes = []

    for (let i = 0; i < eachDatas.childNodes.length; i++) {
        const uid = eachDatas.childNodes[i].uid
        newItemUidsMap[uid] = i
    }

    const preRemoves = {} // 预移除的，可以在后续被复用
    let oldNode = this.firstChild
    while (oldNode) {
        const uid = oldNode.context.dataUid
        if (uid in newItemUidsMap) {
            oldNode.modifyPosition(newItemUidsMap[uid])
            newChildNodes[newItemUidsMap[uid]] = oldNode
            delete newItemUidsMap[uid]
        } else {
            preRemoves[uid] = oldNode
        }
        oldNode = oldNode.nextSibling
    }

    const creates = {}
    for (const uid in newItemUidsMap) {
        const index = newItemUidsMap[uid]
        let reuseVNode = null
        for (const uid in preRemoves) { // 复用
            reuseVNode = preRemoves[uid]
            delete preRemoves[uid]
            break
        }
        if (reuseVNode) {
            reuseVNode.modifyPosition(newItemUidsMap[uid])
            newChildNodes[index] = reuseVNode
        } else {
            creates[uid] = astNode.itemCreateVNode(this, eachDatas.childNodes[index], index)
            newChildNodes[index] = creates[uid]
        }
    }

    if (Object.keys(preRemoves).length > 0) {
        const updates = this.updates = this.updates || {}
        const removes = updates.removes = []
        for (const uid in preRemoves) {
            removes.push(preRemoves[uid])
        }
    }


    // console.info({newChildNodes})

    // console.info(this.childNodes.map(vnode => vnode.updates))
    this._initChildsLinkedList()
    this.modifyChildNodes()
}
VNode.prototype.modifyPosition = function (index) {
    if (this.context.index !== index) { // 位置发生变化
        this.context.index = index
        this.updates = this.updates || {}
        this.updates.modifyPosition = true
    }
}
VNode.prototype.removeCaseNode = function () {
    // const updates = this.parent.updates = this.parent.updates || {}
    // const removes = updates.removes = [ this ]
}

// dom事件
VNode.prototype.originDispatchEvent = function (type, originEvent) {
    const listener = this.events[type]
    const eventContext = this.getEventContext(originEvent)
    const datas = this.context.getRootDatas(this.astNode.inheritDataKeys)
    listener.call(eventContext, datas)
    return eventContext.__getPropagationState__()
}
VNode.prototype.getEventContext = function (originEvent) {
    let eventContext = this.eventContext
    if (eventContext) {
        eventContext.__reset__(originEvent)
    } else {
        EventContext.prototype = this.context.getAllActions(this)
        eventContext = this.eventContext = this.eventContext || new EventContext(this, originEvent)
    }
    return eventContext

    function EventContext (vnode, originEvent) {
        let _enabledPropagation = true

        this.originEvent = originEvent
        this.event = function () {
            return {
                stopPropagation () {
                    _enabledPropagation = false
                },
            }
        }
        this.__reset__ = function (originEvent) {
            _enabledPropagation = true
            this.originEvent = originEvent
        }
        this.__getPropagationState__ = function () {
            return _enabledPropagation
        }
        this.datas = function (keys, condition) {
            return dataQuery(vnode.context, keys, condition)
        }
    }
}

const VNodeUpdate = {
    remove: 1, move: 2, update: 3,
}
// dom渲染
VNode.prototype.dispatch = function (type) {
    // console.info('dispatch', type, this, this.updates)
    if (type === VNodeUpdate.remove) { // 虚拟节点移除操作
        //  console.info('remove', this)
        if (this.isDom) {
            this.removeDom()
            this.events && this.removeEvents()
        } else {
            this.dispatchChildNodes(type)
        }
    } else {
        const updates = this.updates
        if (updates) {
            if (this.isDom) {
                if (updates.createDom) {
                    this.setDom(updates.createDom)
                }
                if (updates.createAttributes) {
                    this.setAttributes(updates.createAttributes)
                }
                if (updates.createEvents) {
                    this.setEvents(updates.createEvents)
                }
                if (updates.modifyAttributes) {
                    this.setAttributes(updates.modifyAttributes)
                }
                if (updates.modifyTextNode) {
                    this.setNodeValue(updates.modifyTextNode.value)
                }
            } else {
                if (updates.removes) {
                    this.dispatchRemoves(updates.removes)
                } else if (updates.modifyPosition) {
                    type = VNodeUpdate.move
                }
            }
            this.updates = null
        }

        if (type === VNodeUpdate.move) { // 虚拟节点移动操作
            if (this.isDom) {
                this.setDom(this.dom)
            } else {
                this.dispatchChildNodes(type)
            }
        } else if (type === VNodeUpdate.remove) {

        } else {
            this.dispatchChildNodes()
        }
    }
}
VNode.prototype.dispatchRemoves = function (removes) {
    //  console.info('dispatchRemoves', removes)
    for (let i = 0; i < removes.length; i++) {
        removes[i].dispatchChildNodes(VNodeUpdate.remove)
    }
}
VNode.prototype.dispatchChildNodes = function (type) {
    const childNodes = this.childNodes
    if (childNodes) {
        for (let i = 0; i < childNodes.length; i++) {
            childNodes[i].dispatch(type)
        }
    }
}

VNode.prototype.setDom = function (dom) {
    const afterSiblingDom = this.getAfterSiblingDom()
    if (afterSiblingDom) { // 存在后兄弟节点， 则在其前面插入
        afterSiblingDom.parentNode.insertBefore(dom, afterSiblingDom)
    } else {
        this.getParentDom().appendChild(dom)
    }
    this.dom = dom
}
VNode.prototype.setAttributes = function (attributes) {
    const dom = this.dom
    this.attributes = this.attributes || {}
    for (const key in attributes) {
        dom.setAttribute(key, attributes[key])
        this.attributes[key] = attributes[key]
    }
}
VNode.prototype.setEvents = function (events) {
    for (const type in events) {
        htmlEvents.add({
            type, vnode: this,
        })
    }
    this.events = events
}
VNode.prototype.setNodeValue = function (nodeValue) {
    this.dom.nodeValue = nodeValue
    this.nodeValue = nodeValue
}
VNode.prototype.removeDom = function () {
    if (this.dom) {
        this.dom.parentNode.removeChild(this.dom)
    }
}
VNode.prototype.removeEvents = function () {
    for (const type in this.events) {
        htmlEvents.remove({
            type, vnode: this,
        })
    }
}

// dom寻址
VNode.prototype.getAfterSiblingDom = function () { // 获取新插入节点后方的第一个兄弟节点
    const previousSiblingDom = this.getPreviousSiblingDom()
    return previousSiblingDom ? previousSiblingDom.nextSibling : null
}
VNode.prototype.getPreviousSiblingDom = function () {
    let targetDom
    let curNode = this
    let previousSibling
    while (curNode) {
        previousSibling = curNode.previousSibling
        while (previousSibling) {
            // console.info(previousSibling)
            if (targetDom = previousSibling.getRightmostDom()) {
                return targetDom
            }
            previousSibling = previousSibling.previousSibling
        }
        if (curNode.parent) {
            curNode = curNode.parent
            if (curNode.isDom) { // 父节点是dom，则不再继续往上冒
                return null
            }
        } else {
            break
        }
    }
    return null
}
VNode.prototype.getParentDom = function () { // 获取父节点
    // console.info(this)
    let parent = this
    while (parent = parent.parent) {
        if (parent.dom) {
            return parent.dom
        }
    }
}
VNode.prototype.getLeftmostDom = function () { // 获取最左侧的真实节点
    if (this.dom) {
        return this.dom
    }
    let targetDom
    let curNode = this.firstChild
    while (curNode) {
        if (targetDom = curNode.getLeftmostDom()) {
            return targetDom
        }
        curNode = curNode.nextSibling
    }
    return null
}
VNode.prototype.getRightmostDom = function () { // 获取最右侧的真实节点
    if (this.dom) {
        return this.dom
    }
    let targetDom
    let curNode = this.lastChild
    while (curNode) {
        if (targetDom = curNode.getRightmostDom()) {
            return targetDom
        }
        curNode = curNode.previousSibling
    }
    return null
}

export default VNode
