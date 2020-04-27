function query (context, keys, condition) {
    return new DataNodes(context, keys, condition)
}

function DataNodes (context, keys, condition) {
    const rootKey = keys.split('.').shift()
    const rootData = context.getRootDataNode(rootKey)
    const filters = newFilters(condition)
    this.context = context
    this.dataNodes = []

    if (filters) {
        this._fillMatchNodes(rootKey, rootData, keys, filters)
    } else {
        this._fillAllNodes(rootKey, rootData, keys)
    }
}
DataNodes.prototype._fillAllNodes = function (rootKey, rootData, keys) {
    let dataNodes
    if (rootKey === keys) {
        dataNodes = [ rootData ]
    } else {
        dataNodes = [ rootData ]
        const dataKeys = keys.split('.')
        let dataKey = dataKeys.shift()
        let dataNode
        while (dataKey = dataKeys.shift()) {
            const nextDataNodes = []
            while (dataNode = dataNodes.shift()) {
                if (!dataNode) {
                    break
                }
                if (dataNode.isArray) {
                    dataNode.childNodes.forEach(dataNode => {
                        nextDataNodes.push(dataNode.childNodes[dataKey])
                    })
                } else {
                    nextDataNodes.push(dataNode.childNodes[dataKey])
                }
            }

            dataNodes = nextDataNodes
        }
    }
    this.dataNodes = dataNodes
}
DataNodes.prototype._fillMatchNodes = function (rootKey, rootData, keys, filters) {
    const rootValueNodeContainer = new ValueNodeContainer({
        parentValueNode: null,
        fullKey: rootKey,
        dataKey: rootKey,
        filters: filters,
        dataNodes: rootData,
    })
    // console.info({ rootValueNodeContainer })
    const paths = keys.split('.')
    const enabledDataNodesMap = {}
    const enabledDataNodesList = []
    let containerQueue = [ rootValueNodeContainer ]
    let container

    let cursorPointer = 0
    let key = paths[cursorPointer]
    const parentEnabledDataNodesMap = {}
    const parentEnabledDataNodesList = []

    while (containerQueue.length > 0) {
        const nextContainerQueue = []
        while (container = containerQueue.shift()) {
            if (container.dataKey === key) {
                if (paths.length === cursorPointer + 1) { // 就是当前节点
                    const valueNodes = container.batches
                    for (let i = 0; i < valueNodes.length; i++) {
                        const valueNode = valueNodes[i]
                        const dataNode = valueNode.dataNode
                        const uid = dataNode.uid
                        if (!enabledDataNodesMap[uid]) {
                            enabledDataNodesMap[uid] = true
                            enabledDataNodesList.push(dataNode)
                        }
                    }
                } else {
                    const valueNodes = container.batches
                    for (let i = 0; i < valueNodes.length; i++) {
                        let theMatchContainer
                        const valueNode = valueNodes[i]
                        if (valueNode.fields) {
                            for (let i = 0; i < valueNode.fields.length; i++) {
                                const container = valueNode.fields[i]
                                if (container.dataKey === paths[cursorPointer + 1]) {
                                    theMatchContainer = container
                                    break
                                }
                            }
                        }
                        if (theMatchContainer) {
                            // console.info({theMatchContainer})
                            nextContainerQueue.push(theMatchContainer)
                        } else {
                            const dataNode = valueNode.dataNode
                            const uid = dataNode.uid
                            if (!parentEnabledDataNodesMap[uid]) {
                                parentEnabledDataNodesMap[uid] = true
                                parentEnabledDataNodesList.push({ dataNode, keys: paths.slice(cursorPointer + 1) })
                            }
                        }
                    }
                }
            } else {
                throw Error('错误')
                // console.info(container.dataKey, key)
            }
        }
        key = paths[++cursorPointer]
        containerQueue = nextContainerQueue
    }

    if (parentEnabledDataNodesList.length) {
        for (let i = 0; i < parentEnabledDataNodesList.length; i++) {
            const item = parentEnabledDataNodesList[i]
            const dataNodes = item.dataNode.getFields(item.keys)
            for (let i = 0; i < dataNodes.length; i++) {
                const dataNode = dataNodes[i]
                const uid = dataNode.uid
                if (!enabledDataNodesMap[uid]) {
                    enabledDataNodesMap[uid] = true
                    enabledDataNodesList.push(dataNode)
                }
            }
            // console.info(dataNode)
        }
    }

    // console.info({parentEnabledDataNodesList, enabledDataNodesList})

    this.dataNodes = enabledDataNodesList
}
DataNodes.prototype.update = function (data) {
    let modifyComponent = null; const modifyDataNodes = []
    const dataNodes = this.dataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        const component = dataNodes[i].update(data)
        if (component) {
            modifyComponent = component
            modifyDataNodes.push(dataNodes[i])
        }
    }
    if (modifyComponent) { // 存在更新的情况下会返回组件引用
        modifyComponent.dateUpdate(modifyDataNodes)
    }
}
DataNodes.prototype.inserts = function (dataList, index) {
    let modifyComponent = null; const modifyDataNodes = []
    const dataNodes = this.dataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        const component = dataNodes[i].inserts(dataList, index >= 0 ? index + i : null)
        if (component) {
            modifyComponent = component
            modifyDataNodes.push(dataNodes[i])
        }
    }
    if (modifyComponent) { // 存在更新的情况下会返回组件引用
        modifyComponent.dateUpdate(modifyDataNodes)
    }
}
DataNodes.prototype.moveUp = function (num = 1) {
    let modifyComponent = null; const modifyDataNodes = []
    const dataNodes = this.dataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        const component = dataNodes[i].moveUp(num)
        if (component) {
            modifyComponent = component
            modifyDataNodes.push(dataNodes[i])
        }
    }
    if (modifyComponent) {
        modifyComponent.dateUpdate(modifyDataNodes)
    }

    // console.info('moveUp', this)
}
DataNodes.prototype.moveDown = function (num = 1) {
    let modifyComponent = null; const modifyDataNodes = []
    const dataNodes = this.dataNodes
    for (let i = 0; i < dataNodes.length; i++) {
        const component = dataNodes[i].moveDown(num)
        if (component) {
            modifyComponent = component
            modifyDataNodes.push(dataNodes[i])
        }
    }
    if (modifyComponent) {
        modifyComponent.dateUpdate(modifyDataNodes)
    }
    // console.info('moveDown', this)
}
DataNodes.prototype.remove = function () {
    let modifyComponent = null; const modifyDataNodes = []
    const dataNodes = this.dataNodes
    // console.info(this.dataNodes)
    for (let i = 0; i < dataNodes.length; i++) {
        const component = dataNodes[i].remove()
        if (component) {
            modifyComponent = component
            modifyDataNodes.push(dataNodes[i])
        }
    }
    if (modifyComponent) {
        modifyComponent.dateUpdate(modifyDataNodes)
    }
}
DataNodes.prototype.value = function () {
    return this.dataNodes[0].value
}
DataNodes.prototype.values = function () {
    return this.dataNodes.map(dataNode => dataNode.value)
}

const filterParserState = {
    start: 0,
    assertTypeInput: 1,
    assertValueInput: 2,
}
const filterRules = {
    '==': function (value1, value2) {
        return value1 === value2
    },
    '!=': function (value1, value2) {
        return value1 !== value2
    },
    '>': function (value1, value2) {
        return typeof value1 === 'number' && typeof value2 === 'number' && value1 > value2
    },
    '<': function (value1, value2) {
        return value1 < value2
    },
}

function newFilters (condition) {
    let filters = null
    if (condition) { // reg_assertValue = /(?:"(?:\\\\|\\\"|[^"])*")|(?:\d+(?:\.\d+)?)/
        const orGroups = []; let andGroup = []; let curItem; let curState = 0
        condition = condition.replace(/((?:"(?:\\\\|\\"|[^"])*")|(?:\d+(?:\.\d+)?)|true|false)|(\w+(?:\.\w+)*)|(==|>=|<=|!=|>|<)|(;|$)|(,)|(.)/g, function (all, assertValue, fieldKeys, assertType, orToken, andToken, otherChar) {
            if (otherChar) {
                throw Error('条件错误')
            }
            switch (curState) {
                case filterParserState.start: {
                    if (fieldKeys) {
                        curState = filterParserState.assertTypeInput
                        curItem = { fieldKeys: fieldKeys }
                    } else if (andToken) {

                    } else if (orToken || orToken === '') {
                        if (andGroup.length) {
                            orGroups.push(andGroup)
                        }
                        andGroup = []
                    }
                    break
                }
                case filterParserState.assertTypeInput: {
                    curState = filterParserState.assertValueInput
                    if (assertType) {
                        curItem.assertType = assertType
                    } else {
                        throw Error('条件错误')
                    }
                    break
                }
                case filterParserState.assertValueInput: {
                    curState = filterParserState.start
                    if (assertValue) {
                        curItem.assertValue = assertValue.charAt(0) === '"'
                            ? assertValue.slice(1, -1)
                            : (
                                assertValue === 'true'
                                    ? true
                                    : (
                                        assertValue === 'false'
                                            ? false
                                            : +assertValue
                                    )
                            )
                        andGroup.push(curItem)
                    } else {
                        throw Error('条件错误')
                    }
                    break
                }
            }
        })
        filters = {}
        orGroups.forEach((andGroups, i) => {
            const groupRule = filters[i] = {}
            andGroups.forEach(rule => {
                const { fieldKeys, assertType, assertValue } = rule
                let obj = groupRule
                fieldKeys.split('.').forEach(key => {
                    obj = obj[key] = obj[key] || {}
                })
                obj['#rules'] = obj['#rules'] || []
                obj['#rules'].push({ exec: filterRules[assertType], value: assertValue })
            })
        })
        // console.info(filters)
    }
    return filters
}


const FilterState = {
    INITIAL: 'initial',
    WAIT: 'wait',
    MATCH: 'match',
    UNMATCH: 'unmatch',
    IGNORE: 'ignore',
}

function ValueNodeContainer (option) {
    this.parentValueNode = option.parentValueNode
    this.fullKey = option.fullKey
    this.dataKey = option.dataKey
    this._initFilters(option.filters)
    this._scanDataNodes(option.dataNodes)
    // console.info(this, option)
}
ValueNodeContainer.prototype._initFilters = function (filters) {
    const dataKey = this.dataKey
    const newFilters = {}
    const groups = newFilters.groups = {}
    const results = newFilters.results = {}
    for (const groupId in filters) {
        const filter = filters[groupId]
        if (filter[dataKey]) {
            groups[groupId] = filter[dataKey]
            results[groupId] = FilterState.INITIAL
        } else {
            groups[groupId] = { '#ignore': true }
            results[groupId] = FilterState.IGNORE
        }
    }
    this.filters = newFilters
}
ValueNodeContainer.prototype._scanDataNodes = function (dataNodes) { // 批量扫描数据节点
    const batches = this.batches = []
    const allMatchGroupIds = {}
    ;(dataNodes.isArray ? dataNodes.childNodes : [ dataNodes ]).forEach(dataNode => {
        const valueNode = new ValueNode({
            parentValueContainer: this,
            dataNode,
        })
        const matchGroupIds = valueNode.getMatchGroupIds()
        if (matchGroupIds.length) {
            for (let i = 0; i < matchGroupIds.length; i++) {
                allMatchGroupIds[matchGroupIds[i]] = true
            }
            batches.push(valueNode)
        }
    })
    const results = this.filters.results
    for (const groupId in results) {
        if (groupId in allMatchGroupIds) { // 任意子项匹配，那么该组为匹配状态
            results[groupId] = FilterState.MATCH
        } else if (results[groupId] === FilterState.INITIAL) { // 从初态设置为不匹配
            results[groupId] = FilterState.UNMATCH
        }
    }
}
ValueNodeContainer.prototype.getUnmatchGroupIds = function () {
    const results = this.filters.results
    const unmatchGroupIds = []
    for (const groupId in results) {
        if (results[groupId] === FilterState.UNMATCH) {
            unmatchGroupIds.push(groupId)
        }
    }
    return unmatchGroupIds
}

function ValueNode (option) {
    this.parentValueContainer = option.parentValueContainer
    this.dataNode = option.dataNode
    this.fields = null
    this.fullKey = this.parentValueContainer.fullKey // 调试字段
    this._initFilters(this.parentValueContainer.filters)
    this._executeValueFilter()
    this._executeFieldsFilter()

    // console.info(this)
}
ValueNode.prototype._initFilters = function (filters) {
    const newFilters = {}
    const groups = newFilters.groups = filters.groups
    const results = newFilters.results = {}
    for (const groupId in groups) {
        results[groupId] = FilterState.WAIT
    }
    this.filters = newFilters
}
ValueNode.prototype._executeValueFilter = function () { // 值应用过滤器
    const dataNode = this.dataNode
    const groups = this.filters.groups
    const results = this.filters.results

    for (const groupId in groups) {
        const group = groups[groupId]
        const rules = group['#rules']
        if (rules) {
            let enabled = true
            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i]
                if (!rule.exec(dataNode.value, rule.value)) { // 任意子规则不匹配
                    enabled = false
                    break
                }
            }
            results[groupId] = enabled ? FilterState.MATCH : FilterState.UNMATCH
        } else if (group['#ignore']) {
            results[groupId] = FilterState.IGNORE
        } else if (group['#unmatch']) {
            results[groupId] = FilterState.UNMATCH
        } else {
            results[groupId] = FilterState.WAIT
        }
    }
}
ValueNode.prototype._executeFieldsFilter = function () { // 子键应用过滤器
    if (!this.dataNode.isObject) { // 非对象没有子键
        return
    }
    this._initFieldsFilters()

    const parentFullKey = this.parentValueContainer.fullKey
    const fieldsGroups = this.filters.fieldsGroups
    const dataValues = this.dataNode.childNodes

    this.fields = []
    for (const dataKey in fieldsGroups) {
        const dataNode = dataValues[dataKey]
        if (!dataNode) {
            continue
        }
        const valueNodeContainer = new ValueNodeContainer({
            dataNodes: dataNode,
            parentValueNode: this,
            fullKey: `${parentFullKey}.${dataKey}`,
            dataKey,
            filters: this._createChildFilters(),
        })
        this._reduceFieldsGroups(valueNodeContainer.getUnmatchGroupIds())
        this.fields.push(valueNodeContainer)
    }
    this._fixEnd()
}
ValueNode.prototype._initFieldsFilters = function () { // 初始化子键过滤器
    const { groups, results } = this.filters
    const fieldsGroups = this.filters.fieldsGroups = {}

    for (const groupId in groups) {
        if (results[groupId] !== FilterState.UNMATCH) {
            const group = groups[groupId]
            for (const key in group) {
                if (key.charAt(0) === '#') { // 系统保留字段
                    continue
                }
                fieldsGroups[key] = fieldsGroups[key] || {}
                fieldsGroups[key][groupId] = true
            }
        }
    }
}
ValueNode.prototype._createChildFilters = function () { // 为子键创建过滤器
    const newFilters = {}
    const { groups, results } = this.filters
    for (const groupId in groups) {
        if (results[groupId] === FilterState.UNMATCH) {
            newFilters[groupId] = { '#unmatch': true }
        } else {
            newFilters[groupId] = groups[groupId]
        }
    }
    return newFilters
}
ValueNode.prototype._reduceFieldsGroups = function (unmatchGroupIds) {
    const { results, fieldsGroups } = this.filters
    for (let i = 0; i < unmatchGroupIds.length; i++) {
        const groupId = unmatchGroupIds[i]
        results[groupId] = FilterState.UNMATCH
        for (const key in fieldsGroups) {
            const allGroupIds = fieldsGroups[key]
            if (allGroupIds[groupId]) {
                delete allGroupIds[groupId] // 移除不可用的组
                if (Object.keys(allGroupIds).length === 0) { // 当组为空时，则移除当前子键
                    delete fieldsGroups[key]
                }
            }
        }
    }
}
ValueNode.prototype._fixEnd = function () {
    const results = this.filters.results
    const fieldsGroups = this.filters.fieldsGroups
    for (const dataKey in fieldsGroups) { // 剩余的键表示没被过滤的
        const groups = fieldsGroups[dataKey]
        for (const groupId in groups) {
            results[groupId] = FilterState.MATCH
        }
        // break
    }
    const newFields = []
    const fields = this.fields
    for (let i = 0; i < fields.length; i++) {
        const valueNodeContainer = fields[i]
        if (valueNodeContainer.dataKey in fieldsGroups) {
            newFields.push(valueNodeContainer)
        }
    }
    this.fields = newFields
}
ValueNode.prototype.getMatchGroupIds = function () {
    const results = this.filters.results
    const matchGroupIds = []
    for (const groupId in results) {
        if (results[groupId] === FilterState.MATCH) {
            matchGroupIds.push(groupId)
        }
    }
    return matchGroupIds
}

export default query
