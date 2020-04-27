// html编译器
import compiler from '../src/view/compiler'

const ast = compiler(`
    <div>
        <h2 :nx="a.b">{{title}}</h2>
        <ul class="list" >
            <li :each="items as item"><text :value="item.name"></li>
        </ul>
    </div>

    <!-- xxx -->

    <div>xxx</div>
`)

console.info({ ast })
