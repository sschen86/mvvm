
const RootContexts = Object.create(null)
const ContextProps = {
    inherit (component) {
        return new Context(component, this)
    },
    inheritEach (option) {
        return new EachContext(option, this)
    },
    getDataNode (keyPath) {
        const paths = keyPath.split('.')
        const rootDataNode = this.getRootDataNode(paths.shift())
        return rootDataNode.getField(paths)
    },
    getRootDatas (keys) {
        const datas = Object.create(null)
        for (const key in keys) {
            const rootKey = key.split('.')[0]
            if (rootKey in datas) {
                continue
            }
            const dataNode = this.getRootDataNode(rootKey)
            if (typeof dataNode === 'object') {
                datas[rootKey] = dataNode.value
            } else {
                datas[rootKey] = dataNode
            }
        }
        return datas
    },
    getRootDataNodes (keys) {
        const dataNodes = Object.create(null)
        for (const key in keys) {
            const rootKey = key.split('.')[0]
            if (rootKey in dataNodes) {
                continue
            }
            const dataNode = this.getRootDataNode(rootKey)
            if (dataNode) {
                dataNodes[rootKey] = dataNode
            }
        }
        return dataNodes
    },
    getRootDataNode (rootKey) {
        let context = this
        do {
            if (rootKey in context.datas) {
                return context.datas[rootKey]
            }
        } while (context = context.parent)
    },
    getAllActions () {
        let context = this
        const actions = Object.create(null)
        do {
            if (context.component) {
                const model = context.component.model.actions
                for (const name in model) {
                    if (name in actions) {
                        continue
                    }
                    actions[name] = model[name]
                }
            }
        } while (context = context.parent)
        return actions
    },
}

let RootContextUid = 0
function RootContext () {
    RootContexts[this.uid = RootContextUid++] = this
    this.datas = Object.create(null)
}
RootContext.prototype.inherit = ContextProps.inherit

let ContextUid = 0
function Context (component, parent) {
    this.uid = ContextUid++
    this.component = component
    this.parent = parent

    Object.assign(this.datas = Object.create(null), component.defaultDatas())
}
Object.assign(Context.prototype, ContextProps)

function EachContext (option, parent) {
    const { eachData, eachIndex, targetDataKey, targetIndexKey } = option
    this.dataUid = eachData.uid
    this.index = eachIndex
    this.parent = parent

    const datas = this.datas = Object.create(null)
    datas[targetDataKey] = eachData
    targetIndexKey && (datas[targetIndexKey] = eachIndex)
}
Object.assign(EachContext.prototype, ContextProps)

export default function () {
    return new RootContext()
}
