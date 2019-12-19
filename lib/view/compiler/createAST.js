import htmlEvents from '../htmlEvents'
import VNode from '../VNode'

const htmlEventTypes = htmlEvents.types
const htmlSpaceChar = String.fromCharCode(160)

const nodeCreaterAttribute = {
    '#:each': (value) => new EachNode(value),
    '#:if': (value) => new SwitchNode(value),
    '#:elseif': (value) => new SwitchCaseNode(value),
    '#:else': (value) => new SwitchCaseNode('true'),
}

const NodeCreaterNodeName = {
    '': (node) => new FragmentNode(node),
    text: (node) => new TextNode(node),
    html: (node) => new HtmlNode(node),
    break: () => new BreakNode(),
    continue: () => new ContinueNode(),
    define: (node) => new DefineNode(node),
    '#root': () => new RootNode(),
    '#common': (node) => new TagNode(node),
}

const EmptyArray = []

// 定义节点的特性
const BaseNode = {
    initBaseNode (option) {
        this.nodeName = option.nodeName
        // console.info('initVNode', this)
    },
    initVNode (context, parent, init) {
        return new VNode({
            astNode: this,
            context,
            parent,
            init,
        })
    },
    createVNode (context, parent) { // 默认的节点创建
        return this.initVNode(context, parent, function () {
            this.initChildNodes()
        })
    },
    modifyVNode (vnode) {
        vnode.modifyChildNodes(vnode)
        // console.info('modifyVNode', vnode)
    },
}
const BranchNode = {
    initBranchNode (option) {
        this.childNodes = []
    },
    appendChild (astNode) {
        const lastChild = this.lastChild
        if (lastChild) {
            lastChild.nextSiblings = astNode
            astNode.previousSiblings = lastChild
            this.lastChild = astNode
        } else {
            this.firstChild = this.lastChild = astNode
        }
        astNode.parentNode = this
        astNode.isSelfDynamic && astNode.bubbleInheritDataKeys()
        astNode.isSelfDom && astNode.bubbleDomType()
        this.childNodes.push(astNode)
    },
    getNextOptions (vnode) {
        return this.childNodes.map(childNode => ({
            astNode: childNode, parentNode: vnode,
        }))
    },
}
const LeafNode = {
    initLeafNode (option) {

    },
    tagNames: {
        input: true, textarea: true, img: true,
    },
}
const DynamicNode = {
    initDynamicNode (option = {}) {
        if (this.isSelfDynamic) {
            return
        }
        if (option.scope) {
            this.scope = true // 生成作用域
        }
        this.localDataKeys = {} // 局部变量
        this.inheritDataKeys = {} // 继承而来的数据
        this.isSelfDynamic = true // 自身动态标识
        this.contextOption = {} // 上下文环境的配置项
    },
    bubbleInheritDataKeys () { // 包含动态数据的节点被添加时，对动态数据依赖进行冒泡扩散
        const parentNode = this.parentNode
        const inheritDataKeys = this.inheritDataKeys
        for (const fullKeys in inheritDataKeys) {
            let curParentNode = parentNode
            while (curParentNode) {
                if (curParentNode.isSelfDynamic) {
                    if (curParentNode.localDataKeys[fullKeys]) { // 当前keys在当前层为局部变量，停止继续冒泡
                        break
                    } else {
                        curParentNode.inheritDataKeys[fullKeys] = true
                    }
                } else { // 设置包含动态子孙的静态节点为动态节点
                    curParentNode.isInfectDynamic = true
                }
                curParentNode = curParentNode.parentNode
            }
        }
    },
    putInheritKeys (keys) {
        for (const key in keys) {
            this.inheritDataKeys[key] = true
        }
    },
}
const DomNode = {
    bubbleDomType () { // 冒泡设置父节点是否真实节点的标识
        const parentNode = this.parentNode
        let curParentNode = parentNode
        while (curParentNode) {
            if (curParentNode.isSelfDom || curParentNode.isInfectDom) {
                break
            }
            curParentNode.isInfectDom = true
            curParentNode = curParentNode.parentNode
        }
    },
}

// 为各节点添加特性
extendProps(RootNode, BaseNode, BranchNode, DynamicNode, {
    __modifyVNode (vnode) {
        // console.info(vnode)
    },
})
extendProps(FragmentNode, BaseNode, BranchNode, {

})
extendProps(TextNode, BaseNode, DomNode, LeafNode, DynamicNode, {
    initTextNode (nodeValue) {
        this.isSelfDom = true
        if (typeof nodeValue === 'object') {
            this.initDynamicNode()
            const { expr, keys } = parseExpr(nodeValue.value)
            this.getNodeValue = Function('context', `return ${expr}`)
            this.putInheritKeys(keys)
        } else {
            this.nodeValue = nodeValue
        }
    },
    createVNode (context, parent) {
        return this.initVNode(context, parent, function () {
            this.initTextNode()
        })
    },
    modifyVNode (vnode) {
        if (this.isSelfDynamic) { // 动态节点，需要进行属性的更新
            vnode.modifyNodeValue()
        }
        // console.info('modifyVNode', vnode)
    },

    ___initVNode (vnode) {
        let nodeValue
        if (this.isSelfDynamic) {
            nodeValue = this.getNodeValue(vnode.context.getDataValues(this.inheritDataKeys))
            nodeValue = typeof nodeValue === 'string' ? nodeValue.replace(/\s/g, htmlSpaceChar) : `${nodeValue}`
        } else {
            nodeValue = this.nodeValue
        }
        // console.info('vnode', vnode)
        const value = document.createTextNode(nodeValue)
        vnode.nextOptions = EmptyArray
        vnode.isSelfDom = true
        vnode.tasks.push({
            vnode,
            type: 'newNode',
            value,
            ready: () => {
                vnode.dom = value
            },
        })
    },
})
extendProps(TagNode, BaseNode, DomNode, BranchNode, LeafNode, DynamicNode, {
    isLeafNode () {
        return this.nodeName in LeafNode.tagNames
    },
    initTagNode (astNode) {
        const staticAttributes = this.staticAttributes = []
        const dynamicAttributes = this.dynamicAttributes = []
        const events = this.events = []

        const attributes = astNode.attributes
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i]
            let attributeName = attribute.name
            const attributeValue = attribute.value
            if (`#${attributeName}` in attributes) {
                if (attributeName.charAt(0) === ':') {
                    attributeName = attributeName.substr(1)
                    if (attributeName in htmlEventTypes) { // 节点事件
                        this.initDynamicNode()
                        const { expr, keys } = parseExpr(attributeValue)
                        this.putInheritKeys(keys)
                        events.push({
                            type: attributeName,
                            listener: Function('context', `this.${expr}`),
                        })
                    } else { // 动态属性节点
                        this.initDynamicNode()
                        const { expr, keys } = parseExpr(attributeValue)
                        this.putInheritKeys(keys)
                        dynamicAttributes.push({
                            key: attributeName,
                            getValue: Function('context', `return ${expr}`),
                        })
                    }
                } else { // 静态属性节点
                    staticAttributes.push({
                        key: attributeName,
                        value: attributeValue,
                    })
                }
            }
        }
    },
    createVNode (context, parent) {
        return this.initVNode(context, parent, function () {
            this.initTagNode()
            this.initAttributes()
            this.initEvents()
            this.initChildNodes()
        })
    },
    modifyVNode (vnode) {
        if (this.isInfectDynamic) { // 存在动态子节点，对子集进行更新
            vnode.modifyChildNodes()
        } else if (this.isSelfDynamic) { // 动态节点，需要进行属性的更新
            vnode.modifyAttributes()
            vnode.modifyChildNodes()
        }
        // console.info('modifyVNode', vnode)
    },
})
extendProps(SwitchNode, BaseNode, DynamicNode, {
    initSwitchNode (condition) {
        this.initDynamicNode()
        this.cases = []
        this.appendCase(new SwitchCaseNode(condition))
    },
    appendCase (astNode) {
        astNode.parentNode = this
        astNode.isSelfDynamic && astNode.bubbleInheritDataKeys()
        this.cases.push(astNode)
    },
    createVNode (context, parent) {
        return this.initVNode(context, parent, function () {
            this.caseIndex = null
            this.initCaseChildNodes()
        })
    },
    modifyVNode (vnode) {
        vnode.modifySwitchCase()
        vnode.modifyChildNodes()
        // console.info('modifyVNode', vnode)
    },
})
extendProps(SwitchCaseNode, BaseNode, BranchNode, DynamicNode, {
    initSwitchCaseNode (condition) {
        const { expr, keys } = parseExpr(condition)
        this.isEnable = Function('context', `return ${expr}`)
        this.putInheritKeys(keys)
    },
    createVNode (context, parent) {
        return this.initVNode(context, parent, function () {
            this.initChildNodes()
        })
    },
})
extendProps(EachNode, BaseNode, BranchNode, DynamicNode, {
    initEachNode (nodeValue) {
        if (!nodeValue) {
            throw Error(':each的值不能为空')
        }

        const args = nodeValue.match(/^([\w.$]+)\s+as\s+(\w+)(?:\s+(\w+))?/)
        if (!args) {
            throw Error(':each的参数错误')
        }

        this.originDataKey = args[1] // 数据源的key，比如：user.books
        this.targetDataKey = args[2] // 目标数据的key，比如：book
        this.targetIndexKey = args[3] // 目标数据的下标，比如：index
    },
    createVNode (context, parent) {
        return this.initVNode(context, parent, function () {
            this.initEachNode()
        })
    },
    itemCreateVNode (vnode, eachData, eachIndex) { // 创建子级虚拟节点
        // eachData, eachIndex, targetDataKey, targetIndexKey
        const option = {
            eachData,
            eachIndex,
            targetDataKey: this.targetDataKey,
            targetIndexKey: this.targetIndexKey,
        }
        // console.info(option)
        return (new EachItemNode(this, eachIndex)).initVNode(vnode.context.inheritEach(option), vnode, function () {
            this.initEachItemNodeChildNodes()
            // console.info('initEachItem', this)
        })
    },
    modifyVNode (vnode) {
        vnode.modifyEachNode()
        // console.info('modifyVNode', vnode)
    },
})
extendProps(EachItemNode, BaseNode, BranchNode, DynamicNode, {
    initEachItemNode (eachNode, index) {

    },
    modifyVNode (vnode) {
        // console.info('EachItemNode', {vnode})
        vnode.modifyChildNodes()
    },
})

function extendProps (Class) {
    const ClassProp = Class.prototype
;[ ...arguments ].slice(1).forEach(sourceProp => {
        for (const key in sourceProp) {
            ClassProp[key] = sourceProp[key]
        }
    })
}

// 链接模板表达式内部变量并提取变量依赖关系
function parseExpr (expressionStatement) {
    // :if="item.name > 12" => { keys:['item.name'], expr:'context.item.name > 12' }
    // :value=" item.name +'some'+ item.price * 4 " => { keys:['item.name', 'item.price'], expr:'context.item.name +\'some\'+ context.item.price * 4' }
    // :elseif=" /\d/.test(some) == true + 'pps' + (name/pp/i) " => { keys:['some', 'name', 'pp', 'i'], expr:'/\d/.test(context.some) == true + \'pps\' + (context.name/context.pp/context.i)' }      =>

    // 以下正则匹配，为抓取变量名生成数据依赖
    // RegExp: (?:(?:^|!|\()\s*\/(?:\[(?:\\\\|\\\]|[^\]])*\]|\\\\|\\\/|[^/])+\/)
    // String: (?:(')(?:\\\\|\\\'|[^'])*\1)
    // MethodName: (?:[\w$]+(?:\.[\w$]+)*(?=\())
    // VarName: ([\w$]+(?:\.[\w$]+)*)

    const keys = {}
    const expr = expressionStatement.replace(/(?:(?:^|!|\()\s*\/(?:\[(?:\\\\|\\\]|[^\]])*\]|\\\\|\\\/|[^/])+\/)|(?:(')(?:\\\\|\\'|[^'])*\1)|(?:[\w$]+(?:\.[\w$]+)*(?=\())|([\w$]+(?:\.[\w$]+)*)/g, function (input, quote, varName) {
        if (!varName || /^(true|false|undefined|null|\d+(\.\d+)?)$/.test(varName)) {
            return input
        } else {
            keys[input] = true
            return `context.${input}`
        }
    })
    // console.info({ keys, expr })
    return { keys, expr }
}


export default function (originRootNode) {
    // return originRootNode
    // 从根节点开始深度优先遍历所有待节点
    let rootNode, item
    const queue = [ { node: originRootNode, parentNode: null } ]
    while (item = queue.shift()) {
        const { node, parentNode } = item
        const result = convertNode(node)

        // 没有结果返回，则该节点将从树中移除
        if (!result) {
            continue
        }

        const { newNode, moreNode } = result

        if (parentNode) {
            if (newNode instanceof SwitchCaseNode) { // SwitchCaseNode需要添加到SwitchNode下
                parentNode.lastChild.appendCase(newNode)
            } else {
                parentNode.appendChild(newNode)
            }
        } else {
            rootNode = newNode
        }

        if (moreNode) { // 假如当前的节点未被消耗，则继续插入队列中展开
            // 假如是switchNode，那么取第一个case作为父节点
            queue.unshift({ node: moreNode, parentNode: newNode instanceof SwitchNode ? newNode.cases[0] : newNode })
        } else if (node.childNodes) {
            // 继续对子级进行展开，因为说插入到队列开头，所以子节点从后面开始插入
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                queue.unshift({ node: node.childNodes[i], parentNode: newNode })
            }
        }
    }

    return rootNode
}

// 生成对应待节点
function convertNode (node) {
    if (node.nodeType === 'TextNode') {
        const value = node.value.trim()
        if (/\n/.test(node.value) && value === '') {
            return
        }

        return { newNode: new TextNode(node) }
    }

    if (node.nodeType === 'CommentNode') {
        return { newNode: new CommentNode(node.value) }
    }

    return createNodeFromAttribute(node) || createNodeFromNodeName(node)
}

function createNodeFromAttribute (node) {
    const attributes = node.attributes
    for (const key in nodeCreaterAttribute) {
        if (attributes[key]) {
            const newNode = nodeCreaterAttribute[key](attributes[key].value)
            delete attributes[key]
            return { newNode, moreNode: node }
        }
    }
}

function createNodeFromNodeName (node) {
    const nodeCreate = NodeCreaterNodeName[node.nodeName] || NodeCreaterNodeName['#common']
    return { newNode: nodeCreate(node) }
}


// 节点类
function RootNode () {
    this.initBaseNode({ nodeName: '#root' })
    this.initBranchNode()
    this.initDynamicNode({ scope: true })
}
function FragmentNode (node) {
    this.initBaseNode({ nodeName: '#fragment' })
    this.initBranchNode()
}
function TextNode (node) {
    this.initBaseNode({ nodeName: '#text' })
    this.initLeafNode()
    this.initTextNode(
        node.nodeType === 'TextNode'
            ? node.value.replace(/[ ]*\n[ ]*/g, '')
            : node.attributes['#:value'],
    )
}
function CommentNode (value) {

}
function TagNode (node) {
    this.initBaseNode({ nodeName: node.nodeName })
    if (this.isLeafNode()) {
        this.initLeafNode()
    } else {
        this.initBranchNode()
    }
    this.initTagNode(node)
}
function EachNode (nodeValue) {
    this.initBaseNode({ nodeName: '#each' })
    this.initBranchNode()
    this.initEachNode(nodeValue)
}
function EachItemNode (eachNode, index) {
    this.initBaseNode({ nodeName: '#eachitem' })
    this.initBranchNode()
    this.initDynamicNode({ scope: true })
    this.initEachItemNode(eachNode, index)
}
function SwitchNode (condition) {
    this.initBaseNode({ nodeName: '#switch' })
    this.initSwitchNode(condition)
}
function SwitchCaseNode (condition) {
    this.initBaseNode({ nodeName: '#switchCase' })
    this.initBranchNode()
    this.initDynamicNode()
    this.initSwitchCaseNode(condition)
}
function HtmlNode (node) {

}
function BreakNode () {

}
function ContinueNode () {

}
function DefineNode (node) {

}
