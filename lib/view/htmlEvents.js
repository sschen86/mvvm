
let domreadyState = 0 // 0 未就绪，1 监听中, 2 已完成
let domreadyQueue
const htmlEvents = {
    globals: {
        domready (callback) {
            if (domreadyState === 1) {
                domreadyQueue.push({ callback, context: this })
            } else if (domreadyState === 2) {
                callback.call(this)
            } else if (domreadyState === 0) {
                domreadyState = 1
                domreadyQueue = [ { callback, context: this } ]
                window.addEventListener('DOMContentLoaded', function () {
                    domreadyState = 2
                    let item
                    while (item = domreadyQueue.shift()) {
                        item.callback.call(item.context)
                    }
                    domreadyQueue = null
                })
            }
        },
        windowScroll (callback) {

        },
    },
    types: {
        click: new TypeHtmlEvents('click'),
        mousedown: new TypeHtmlEvents('mousedown'),
        keyup: new TypeHtmlEvents('keyup'),
    },
    add (option) {
        this.types[option.type].add(option.vnode)
    },
    remove (option) {
        this.types[option.type].remove(option.vnode)
    },
}

function TypeHtmlEvents (type) {
    this.type = type
    this.vnodeLinkedList = new VNodeLinkedList() // 监听事件的虚拟节点链表
    this.isActived = false
}
TypeHtmlEvents.prototype.add = function (vnode) {
    this.vnodeLinkedList.addNode(vnode)
    if (!this.isActived) {
        this.start()
    }
}
TypeHtmlEvents.prototype.remove = function (vnode) {
    this.vnodeLinkedList.removeNode(vnode)
    if (!this.vnodeLinkedList.head) {
        this.stop()
    }
}
TypeHtmlEvents.prototype.getVNode = function (dom) {
    return this.vnodeLinkedList.findVNode(dom)
}
TypeHtmlEvents.prototype.start = function () {
    const eventType = this.type
    this.isActived = true
    this.stop = function () {
        this.isActived = false
        document.removeEventListener(eventType, listener)
    }
    document.addEventListener(eventType, listener)

    const that = this
    function listener (originEvent) {
        const target = originEvent.target
        let vnode = that.getVNode(target)
        while (vnode) {
            if (vnode.dispatchEvent && vnode.dispatchEvent(eventType, originEvent) === false) { // 假如返回false，则阻止冒泡
                break
            }
            vnode = vnode.parent
        }
    }
}

function VNodeLinkedList () { // 节点单向链表
    this.head = null
    this.tail = null
    this.indexs = {} // vnode索引linkedNode
}
VNodeLinkedList.prototype.addNode = function (vnode) {
    const linkedNode = { vnode }
    const tail = this.tail
    if (tail) {
        linkedNode.prev = tail
        tail.next = linkedNode
    } else {
        this.head = linkedNode
    }
    this.tail = linkedNode
    this.indexs[vnode.uid] = linkedNode
}
VNodeLinkedList.prototype.removeNode = function (vnode) {
    const linkedNode = this.indexs[vnode.uid]
    const prev = linkedNode.prev
    const next = linkedNode.next
    if (prev) {
        prev.next = next
    } else {
        this.head = next
    }
    if (next) {
        next.prev = prev
    } else {
        this.tail = prev
    }
    delete this.indexs[vnode.uid]
}
VNodeLinkedList.prototype.findVNode = function (dom) {
    let node = this.head
    const scaned = {}

    while (node) {
        const vnode = node.vnode
        if (!scaned[vnode.uid]) { // 仅对还未扫描过的虚拟节点进行扫描
            scaned[vnode.uid] = true // 标记已扫描状态

            if (vnode.dom === dom) {
                return vnode
            }
            const queue = [ ...vnode.childNodes ] // 对所有子孙虚拟节点进行扫描
            let cvnode
            while (cvnode = queue.shift()) {
                scaned[cvnode.uid] = true
                if (cvnode.dom === dom) {
                    return cvnode
                }
                if (cvnode.childNodes) {
                    queue.unshift(...cvnode.childNodes)
                }
            }
        }
        node = node.next
    }
}

export default htmlEvents
