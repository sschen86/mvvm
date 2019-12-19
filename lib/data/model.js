import types from './types'

function model (option) {
    return new DataModel(option)
}

function DataModel (option) {
    const model = Object.create(null)
    const datas = Object.create(null)

    for (const key in option) {
        const value = option[key]
        if (types.is(value)) {
            model[key] = value
        } else {
            datas[key] = new ConstDataNode(value)
        }
    }

    this.model = model
    this.datas = datas
    this._initDefaultDatas()
}
DataModel.prototype._initDefaultDatas = function () {
    const model = this.model // 默认数据
    const defaultDatas = this.defaultDatas = Object.create(null)
    for (const key in model) {
        defaultDatas[key] = model[key].getDefaultValue()
    }
}
DataModel.prototype.getDefaultValue = function (component) {
    const defaultValue = Object.create(null)
    const model = this.model
    for (const key in model) {
        defaultValue[key] = new VariableDataNode(model[key].getDefaultValue(), null, model[key], key)
        defaultValue[key].component = component
    }

    const constDatas = this.datas // 常量数据
    for (const key in constDatas) {
        defaultValue[key] = constDatas[key]
    }

    return defaultValue
}

const DataNodeProps = {
    getField (paths) {
        if (paths.length > 0) {
            let cursor = this
            for (let i = 0; i < paths.length; i++) {
                const key = paths[i]
                if (key in cursor.childNodes) {
                    cursor = cursor.childNodes[key]
                } else {
                    throw Error(`不存在当前字段${paths}`)
                }
            }
            return cursor
        } else {
            return this
        }
    },
    getFields (paths) {
        if (paths.length > 0) {
            let queue = [ this ]; let cursor
            for (let i = 0; i < paths.length; i++) {
                const key = paths[i]
                const nextQueue = []
                while (cursor = queue.shift()) {
                    if (cursor.isArray) {
                        for (let i = 0; i < cursor.childNodes.length; i++) {
                            nextQueue.push(cursor.childNodes[i].childNodes[key])
                        }
                    } else if (cursor.isObject) {
                        nextQueue.push(cursor.childNodes[key])
                    } else {
                        throw Error('字段不存在')
                    }
                }
                queue = nextQueue
            }
            return queue
        } else {
            return [ this ]
        }
    },
}

function ConstDataNode (value, parentNode) { // 常量数据节点
    this.parentNode = parentNode
    if (Array.isArray(value)) {
        this.childNodes = []
        this.value = []
        this.isArray = true
        value.forEach(arrItem => {
            const childNode = new ConstDataNode(arrItem, this)
            this.childNodes.push(childNode)
            this.value.push(childNode.value)
        })
    } else if (value && typeof value === 'object') {
        this.childNodes = {}
        this.value = Object.create(null)
        this.isObject = true
        for (const key in value) {
            const childNode = new ConstDataNode(value[key], this)
            this.childNodes[key] = childNode
            this.value[key] = childNode.value
        }
    } else {
        this.isLiteral = true
        this.value = value
    }
}
ConstDataNode.prototype.getField = DataNodeProps.getField
ConstDataNode.prototype.getFields = DataNodeProps.getFields

let VariableDataNodeUid = 0 // 数据节点ID标识，递增
function VariableDataNode (value, parentNode, types, key) { // 变量数据节点
    this.uid = VariableDataNodeUid++
    this.parentNode = parentNode
    this.version = 0
    this.types = types
    this.key = key
    if (Array.isArray(value)) {
        this.childNodes = []
        this.value = []
        this.isArray = true
        value.forEach(arrItem => {
            const childNode = new VariableDataNode(arrItem, this, types.values, key)
            this.childNodes.push(childNode)
            this.value.push(childNode.value)
        })
    } else if (value && typeof value === 'object') {
        this.childNodes = {}
        this.value = Object.create(null)
        this.isObject = true
        for (const key in value) {
            const childNode = new VariableDataNode(value[key], this, types.keys[key], key)
            this.childNodes[key] = childNode
            this.value[key] = childNode.value
        }
    } else {
        this.isLiteral = true
        this.value = value
    }
    // console.info('vari', {key, value})
}
VariableDataNode.prototype.update = function (value) {
    if (this.isLiteral) {
        if (this.value === value) {
            return
        }
        this.oldValue = this.value
        this.value = value
        this.parentNode && (this.parentNode.value[this.key] = value)
    } else if (this.isObject) {

    } else if (this.isArray) {

    }
    return this.getComponent()
    // this.getComponent().dateUpdate(this)
    // this.getComponent().
    // console.info('dataNode.update', this, value, this.getComponent())
}
VariableDataNode.prototype.inserts = function (dataList, index) {
    if (!this.isArray) {
        throw Error('数据类型错误')
    }
    const newChildNodes = []
    const newValues = []
    dataList.forEach(arrItem => {
        const childNode = new VariableDataNode(arrItem, this, this.types.values, this.key)
        newChildNodes.push(childNode)
        newValues.push(childNode.value)
    })

    if (index == null || index >= this.childNodes.length) {
        this.childNodes = this.childNodes.concat(newChildNodes)
        this.value = this.value.concat(newValues)
    } else {
        this.childNodes.splice(index, 0, ...newChildNodes)
        this.value.splice(index, 0, ...newValues)
    }

    return this.getComponent()
}
VariableDataNode.prototype.moveUp = function (num) {
    return this.parentNode.childMoveUp(this, num)
}
VariableDataNode.prototype.moveDown = function (num) {
    return this.parentNode.childMoveDown(this, num)
}
VariableDataNode.prototype.childMoveUp = function (childNode, num) {
    if (!this.isArray) {
        throw Error('数据错误')
    }
    const childNodes = this.childNodes
    const beforeIndex = childNodes.indexOf(childNode)
    const afterIndex = Math.max(0, beforeIndex - num)

    // console.info({childNodes})
    if (beforeIndex !== afterIndex) {
        childNodes.splice(beforeIndex, 1)
        childNodes.splice(afterIndex, 0, childNode)

        const value = this.value
        value.splice(beforeIndex, 1)
        value.splice(afterIndex, 0, childNode.value)
        return this.getComponent()
    } else {
        // console.info('skip')
    }
}
VariableDataNode.prototype.childMoveDown = function (childNode, num) {
    if (!this.isArray) {
        throw Error('数据错误')
    }
    const childNodes = this.childNodes
    const beforeIndex = childNodes.indexOf(childNode)
    const afterIndex = Math.min(childNodes.length, beforeIndex + num)

    // console.info({childNodes})
    if (beforeIndex !== afterIndex) {
        childNodes.splice(beforeIndex, 1)
        childNodes.splice(afterIndex, 0, childNode)

        const value = this.value
        value.splice(beforeIndex, 1)
        value.splice(afterIndex, 0, childNode.value)
        return this.getComponent()
    } else {
        //  console.info('skip')
    }
}
VariableDataNode.prototype.remove = function () {
    return this.parentNode.childRemove(this)
}
VariableDataNode.prototype.childRemove = function (childNode) {
    if (!this.isArray) {
        throw Error('数据错误')
    }
    const childNodes = this.childNodes
    const targetIndex = childNodes.indexOf(childNode)
    childNodes.splice(targetIndex, 1)
    this.value.splice(targetIndex, 1)
    return this.getComponent()
}

VariableDataNode.prototype.getComponent = function () {
    let cursor = this
    while (true) {
        if (cursor.parentNode) {
            cursor = cursor.parentNode
        } else {
            // @ts-ignore
            return cursor.component
        }
    }
}

VariableDataNode.prototype.commit = function () {
    if (this.isLiteral) {
        this.oldValue = null
    }
}
VariableDataNode.prototype.rollback = function () {
    if (this.isLiteral) {
        this.value = this.oldValue
        this.parentNode && (this.parentNode.value[this.key] = this.oldValue)
        this.oldValue = null
    }
}
VariableDataNode.prototype.getField = DataNodeProps.getField
VariableDataNode.prototype.getFields = DataNodeProps.getFields

export default model
