const S = createStates() // 初始化状态机待状态表
const E = createElements() // 初始化html标签定义表

export default parseHTML

function parseHTML (code) {
    let curState // 当前状态
    let curChar // 当前字符
    let curNode // 当前节点
    let rootNode // 根节点
    let lexemeBegin // 当前单词开始下标
    let forward // 当前字符所在下标
    let isContinue = true

    Node.prototype.appendChild = function (childNode) {
        this.childNodes.push(childNode)
        childNode.parentNode = this
    }
    Node.prototype.addAttribute = function (attrName) {
        const attributes = this.attributes
        attributes[`#${attrName}`] = attributes[attributes.length++] = { name: attrName }
    }
    Node.prototype.setAttribute = function (attrName, attrValue) {
        this.attributes[`#${attrName}`].value = attrValue
    }

    curNode = rootNode = new Node('#root')
    forward = 0
    curState = S.start

    while (isContinue) {
        curChar = code[forward]
        // console.info({curChar, curState})
        // if(i++ > 122){break}
        switch (curState) {
            case S.start: {
                if (curChar === '<') {
                    curState = S.openTagTokenOrCommentLeftToken
                } else {
                    curState = S.textNodeValueStart
                }
                continue
            }
            case S.openTagTokenOrCommentLeftToken: {
                curState = S.openTagTokenOrCommentLeftTokenIgnore
                continue
            }
            case S.openTagTokenOrCommentLeftTokenIgnore: {
                curState = S.isTagOpenStartOrCommentStart
                break
            }
            case S.isTagOpenStartOrCommentStart: {
                if (curChar === '!') {
                    curState = S.commentStart
                } else {
                    curState = S.openTagNameStart
                }
                continue
            }

            case S.openTagNameStart: {
                curState = S.openTagNameInput
                lexemeBegin = forward
                continue
            }
            case S.openTagNameInput: {
                if (!/[\w.]/.test(curChar)) {
                    curState = S.openTagNameReady
                    continue
                }
                break
            }
            case S.openTagNameReady: {
                curState = S.attrStart
                appendNode(new Node(code.substring(lexemeBegin, forward)))
                continue
            }
            case S.attrStart: {
                curState = S.whiteSpaceBeforeAttrNameIgnore
                continue
            }
            case S.whiteSpaceBeforeAttrNameIgnore: {
                if (!/\s/.test(curChar)) {
                    curState = S.attrNameStart
                    continue
                }
                break
            }
            case S.attrNameStart: {
                curState = S.attrNameInput
                lexemeBegin = forward
                continue
            }
            case S.attrNameInput: {
                if (curChar == null || !/[-\w_.:]/.test(curChar)) {
                    curState = S.attrNameReady
                    continue
                }
                break
            }
            case S.attrNameReady: {
                curState = S.whiteSpaceAfterAttrNameIgnore
                addAttribute(code.substring(lexemeBegin, forward))
                // console.info('attrNameReady', '#'+code.substring(lexemeBegin, forward)+'#')
                continue
            }
            case S.whiteSpaceAfterAttrNameIgnore: {
                if (curChar === '=') {
                    curState = S.attrEqualTokenIgnore
                    continue
                } else if (curChar === '>') {
                    curState = S.openTagRightTokenIgnore
                    continue
                } else if (curChar === '/') {
                    curState = S.selfCloseTagSlashTokenIgnore
                    continue
                } else if (curChar == null) {
                    throwError('代码不完整')
                } else if (/[-:\w]/.test(curChar)) {
                    curState = S.attrStart
                    continue
                } else if (!/\s/.test(curChar)) {
                    throwError(`属性名后面不能出现字符\`${curChar}\``)
                }
                break
            }
            case S.attrEqualTokenIgnore: {
                curState = S.whiteSpaceAfterEqualTokenIgnore
                break
            }
            case S.whiteSpaceAfterEqualTokenIgnore: {
                if (curChar === '"') {
                    curState = S.attrValueLeftTokenIgnore
                    continue
                } else if (!/\s/.test(curChar)) {
                    throwError('属性名必须以"开始')
                }
                break
            }
            case S.attrValueLeftTokenIgnore: {
                curState = S.attrValueStart
                break
            }
            case S.attrValueStart: {
                curState = S.attrValueInput
                lexemeBegin = forward
                continue
            }
            case S.attrValueInput: {
                if (curChar === '"') {
                    curState = S.attrValueReady
                    continue
                }/* else if(curChar == '\n'){
                    throwError('属性值中不能存在换行')
                } */
                break
            }
            case S.attrValueReady: {
                curState = S.attrValueRightTokenIgnore
                setAttrbuteValue(code.substring(lexemeBegin, forward))
                // console.info('attrValueReady', '#'+code.substring(lexemeBegin, forward)+'#')
                continue
            }
            case S.attrValueRightTokenIgnore: {
                curState = S.attrStart
                break
            }
            case S.openTagRightTokenIgnore: {
                curState = S.openTagReady
                break
            }
            case S.openTagReady: {
                curState = S.nextItemStart
                if (E[curNode.nodeName] && E[curNode.nodeName].selfClose) {
                    curState = S.closeTagReady
                }
                continue
            }
            case S.nextItemStart: {
                if (curChar === '<') {
                    curState = S.isOpenTagTokenOrCloseTagTokenIgnore
                } else if (curChar == null) {
                    curState = S.complete
                } else if (curChar === '>') {
                    throwError(`节点不能出现字符\`${curChar}\``)
                } else {
                    curState = S.start
                }
                continue
            }
            case S.selfCloseTagSlashTokenIgnore: {
                curState = S.closeTagRightTokenStart
                break
            }
            case S.closeTagRightTokenStart: {
                if (curChar === '>') {
                    curState = S.closeTagRightTokenIgnore
                    continue
                }
                throwError(`关闭标签不能为\`${curChar}\``)
                break
            }
            case S.closeTagRightTokenIgnore: {
                curState = S.closeTagReady
                break
            }
            case S.closeTagReady: {
                curState = S.nextItemStart
                closeNode()
                continue
            }
            case S.textNodeValueStart: {
                curState = S.textNodeValueInput
                lexemeBegin = forward
                continue
            }
            case S.textNodeValueInput: {
                if (curChar == null || /<|>/.test(curChar)) {
                    curState = S.textNodeValueReady
                    continue
                }
                break
            }
            case S.textNodeValueReady: {
                curState = S.nextItemStart
                appendNode(new TextNode(code.substring(lexemeBegin, forward)))
                // console.info('textNodeValueReady', '#'+code.substring(lexemeBegin, forward)+'#')
                continue
            }

            case S.complete: {
                isContinue = false
                if (!isRoot()) {
                    throwError(`标签<${curNode.nodeName}>未闭合`)
                }
                continue
            }
            case S.isOpenTagTokenOrCloseTagTokenIgnore: {
                curState = S.isCloseTagSlashToken
                break
            }
            case S.isCloseTagSlashToken: {
                if (curChar === '/') {
                    curState = S.closeTagSlashTokenIgnore
                } else if (curChar === '!') {
                    curState = S.commentStart
                } else {
                    curState = S.openTagNameStart
                }
                continue
            }
            case S.closeTagSlashTokenIgnore: {
                curState = S.closeTagNameStart
                break
            }
            case S.closeTagNameStart: {
                curState = S.closeTagNameInput
                lexemeBegin = forward
                continue
            }
            case S.closeTagNameInput: {
                if (!/[\w.]/.test(curChar)) {
                    curState = S.closeTagNameReady
                    continue
                }
                break
            }
            case S.closeTagNameReady: {
                curState = S.closeTagRightTokenStart
                const closeTagName = code.substring(lexemeBegin, forward)
                if (closeTagName !== curNode.nodeName) {
                    throwError(`开启标签<${curNode.nodeName}>和闭合标签<${closeTagName}>不匹配`)
                }
                // console.info('closeTagNameReady', '#'+code.substring(lexemeBegin, forward)+'#')
                continue
            }

            // comment
            case S.commentStart: {
                curState = S.commentLeftTokenIgnore
                continue
            }
            case S.commentLeftTokenIgnore: {
                curState = S.commentLeftLine1TokenIgnore
                break
            }
            case S.commentLeftLine1TokenIgnore: {
                if (curChar === '-') {
                    curState = S.commentLeftLine2TokenIgnore
                } else {
                    throwError('注释缺少开始符`-`')
                }
                break
            }
            case S.commentLeftLine2TokenIgnore: {
                if (curChar === '-') {
                    curState = S.commentContentStart
                } else {
                    throwError('注释缺少开始符`-`')
                }
                break
            }
            case S.commentContentStart: {
                curState = S.commentContentInput
                lexemeBegin = forward
                continue
            }
            case S.commentContentInput: {
                if (curChar === '-') {
                    curState = S.commentRightLine1TokenIgnore
                    continue
                } else if (curChar == null) {
                    throwError('注释未正常结束')
                }
                break
            }
            case S.commentRightLine1TokenIgnore: {
                curState = S.commentRightLine2TokenIgnore
                break
            }
            case S.commentRightLine2TokenIgnore: {
                if (curChar === '-') {
                    curState = S.commentRightTokenIgnore
                } else {
                    curState = S.commentContentInput
                    continue
                }
                break
            }
            case S.commentRightTokenIgnore: {
                if (curChar === '>') {
                    curState = S.commentContentReady
                } else if (curChar === '-') {
                    curState = S.commentRightLine2TokenIgnore
                    continue
                } else {
                    curState = S.commentContentInput
                    continue
                }
                break
            }
            case S.commentContentReady: {
                curState = S.nextItemStart
                appendNode(new CommentNode(code.substring(lexemeBegin, forward - 3)))
                continue
            }


            case S.unkown: {
                break
            }
        }
        // console.info({ forward, curState, curChar})
        forward++
    }

    return rootNode


    function Node (nodeName) {
        const element = E[nodeName]
        if (element) {
            this.nodeType = element.nodeType
            this.nodeName = element.nodeName
        } else {
            this.nodeType = 'Unkown'
            this.nodeName = nodeName
        }

        this.childNodes = []
        this.attributes = { length: 0 }
    }

    function TextNode (nodeValue) {
        this.nodeType = 'TextNode'
        this.value = nodeValue
    }

    function CommentNode (nodeValue) {
        this.nodeType = 'CommentNode'
        this.value = nodeValue
    }

    function throwError (msg) {
        const lines = (code.substring(0, forward + 1)).split('\n')
        const lastLine = lines[lines.length - 1]
        const err = { line: lines.length, col: lastLine.length, lineText: lastLine, msg }
        // console.info(err)
        throw err
    }

    function appendNode (newNode) {
        curNode.appendChild(newNode)
        if (newNode instanceof Node) {
            curNode = newNode
        }
    }

    function addAttribute (attrName) {
        if (attrName === '') {
            return
        }
        curNode.addAttribute(attrName)
    }

    function setAttrbuteValue (attrValue) {
        const attributes = curNode.attributes
        curNode.setAttribute(attributes[attributes.length - 1].name, attrValue)
    }

    function closeNode () {
        curNode = curNode.parentNode
    }

    function isRoot () {
        return curNode === rootNode
    }
}

function createStates () {
    const states = { // 状态集
        start: 0, // 开始状态
        openTagTokenOrCommentLeftToken: 0, // 开始标签开始
        openTagTokenOrCommentLeftTokenIgnore: 0, // 开始标签标识`<`
        isTagOpenStartOrCommentStart: 0, // 判断下个状态
        openTagNameStart: 0, // 开始标签名开始
        openTagNameInput: 0, // 开始标签名读取中
        openTagNameReady: 0, // 开始标签名就绪
        attrStart: 0, // 属性开始
        whiteSpaceBeforeAttrNameIgnore: 0, // 空白忽略
        attrNameStart: 0, // 属性名开始
        attrNameInput: 0, // 属性名读取中
        attrNameReady: 0, // 属性名就绪
        whiteSpaceAfterAttrNameIgnore: 0, // 空白忽略
        attrEqualTokenIgnore: 0, // 标识符`=`
        whiteSpaceAfterEqualTokenIgnore: 0, // 空白忽略
        attrValueLeftTokenIgnore: 0, // 属性值左标识符`"`
        attrValueStart: 0, // 属性值开始
        attrValueInput: 0, // 属性值读取中
        attrValueReady: 0, // 属性值就绪
        attrValueRightTokenIgnore: 0, // 属性值右标识符`"`
        openTagRightTokenIgnore: 0, // 标识符`>`
        openTagReady: 0, // 开始标签完成
        nextItemStart: 0, // 下一个元素开始
        selfCloseTagSlashTokenIgnore: 0, // 自关闭标识符`/`
        closeTagRightTokenStart: 0, // 闭合标签标识符开始
        closeTagRightTokenIgnore: 0, // 忽略
        closeTagReady: 0, // 关闭标签就绪
        textNodeValueStart: 0, // 文本节点开始
        textNodeValueInput: 0, // 文本节点输入中
        textNodeValueReady: 0, // 文本节点就绪
        complete: 0, // 完成
        isOpenTagTokenOrCloseTagTokenIgnore: 0, // 读取标识符`<`
        isCloseTagSlashToken: 0, // 判断标识符`/`
        closeTagSlashIgnore: 0, // 读取标识符`/`
        closeTagNameStart: 0, // 闭合标签名开始
        closeTagNameInput: 0, // 闭合标签名读取中
        closeTagNameReady: 0, // 闭合标签名就绪

        commentStart: 0, // 注释开始
        commentLeftTokenIgnore: 0, // 注释标识符`!`
        commentLeftLine1TokenIgnore: 0, // 注释标识符`-`
        commentLeftLine2TokenIgnore: 0, // 注释标识符`-`
        commentContentStart: 0, // 注释内容开始
        commentContentInput: 0, // 注释内容读取中
        commentRightLine1TokenIgnore: 0, // 注释标识符`-`
        commentRightLine2TokenIgnore: 0, // 注释标识符`-`
        commentRightTokenIgnore: 0, // 注释标识符`>`
        commentContentReady: 0, // 注释内容读取完毕，需要去除`-->`

        unkown: 0, // 未知
    }
    for (const key in states) {
        states[key] = key
    }
    return states
}

function createElements () {
    return {
        a: { selfClose: false, nodeName: 'a', nodeType: 'Element' },
        p: { selfClose: false, nodeName: 'p', nodeType: 'Element' },
        i: { selfClose: false, nodeName: 'i', nodeType: 'Element' },
        ul: { selfClose: false, nodeName: 'ul', nodeType: 'Element' },
        ol: { selfClose: false, nodeName: 'ol', nodeType: 'Element' },
        li: { selfClose: false, nodeName: 'li', nodeType: 'Element' },
        h1: { selfClose: false, nodeName: 'h1', nodeType: 'Element' },
        h2: { selfClose: false, nodeName: 'h2', nodeType: 'Element' },
        h3: { selfClose: false, nodeName: 'h3', nodeType: 'Element' },
        h4: { selfClose: false, nodeName: 'h4', nodeType: 'Element' },
        h5: { selfClose: false, nodeName: 'h5', nodeType: 'Element' },
        h6: { selfClose: false, nodeName: 'h6', nodeType: 'Element' },
        div: { selfClose: false, nodeName: 'div', nodeType: 'Element' },

        input: { selfClose: true, nodeName: 'input', nodeType: 'Element' },
        img: { selfClose: true, nodeName: 'img', nodeType: 'Element' },
        br: { selfClose: true, nodeName: 'br', nodeType: 'Element' },

        '#root': { selfClose: false, nodeName: '#root', nodeType: 'Root' },

        text: { selfClose: true, nodeName: 'text', nodeType: 'Element' },
    }
}
