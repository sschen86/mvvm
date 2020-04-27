
const types = {
    object (dataModel, option) {
        return new ObjectNode(dataModel, option)
    },
    array (dataModel, option) {
        return new ArrayNode(dataModel, option)
    },
    string (defaultValue, option) {
        return new StringNode(defaultValue, option)
    },
    number (defaultValue, option) {
        return new NumberNode(defaultValue, option)
    },
    boolean (defaultValue, option) {
        return new BooleanNode(defaultValue, option)
    },
    is (node) {
        return node instanceof BaseNode
    },
}

const DefaultValueObject = {}
const DefaultValueArray = []
const DefaultValueString = ''
const DefaultValueNumber = 0
const DefaultValueBoolean = false

extendProps(ObjectNode, {
    validate (value) {
        if (typeof value !== 'object' || value === null) {
            throw Error('类型错误')
        }
    },
})
extendProps(ArrayNode, {
    validate (value) {
        if (!Array.isArray(value)) {
            throw Error('类型错误')
        }
    },
})
extendProps(StringNode, {
    validate (value) {
        if (typeof value !== 'string') {
            throw Error('类型错误')
        }
    },
})
extendProps(NumberNode, {
    validate (value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw Error('类型错误')
        }
    },
})
extendProps(BooleanNode, {
    validate (value) {
        if (typeof value !== 'boolean') {
            throw Error('类型错误')
        }
    },
})

Object.assign(BaseNode.prototype, {
    getDefaultValue () {
        return this.defaultValue
    },
})

export default types

function BaseNode () {}

function ObjectNode (dataModel, defaultValue) {
    this.keys = dataModel
    this.defaultValue = defaultValue || DefaultValueObject
}
function ArrayNode (dataModel, defaultValue) {
    if (types.is(dataModel)) {
        this.values = dataModel
    } else if (typeof dataModel === 'object') {
        this.values = types.object(dataModel)
    }
    this.defaultValue = defaultValue || DefaultValueArray
}
function StringNode (defaultValue) {
    this.defaultValue = defaultValue || DefaultValueString
}
function NumberNode (defaultValue) {
    this.defaultValue = defaultValue || DefaultValueNumber
}
function BooleanNode (defaultValue) {
    this.defaultValue = defaultValue || DefaultValueBoolean
}

function extendProps (Class) {
    const ClassProp = Class.prototype = new BaseNode()
    ;[ ...arguments ].slice(1).forEach(sourceProp => {
        for (const key in sourceProp) {
            ClassProp[key] = sourceProp[key]
        }
    })
}
