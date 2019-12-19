
import parseHTML from './parseHTML'
import createAST from './createAST'

export default function compiler (template) {
    return createAST(parseHTML(template))
}
