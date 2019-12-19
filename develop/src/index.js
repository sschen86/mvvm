import dva from '../../lib'
import './compiler-test'


dva({
    template: `
        <div :style="'color:'+color">
            <h1 :click="changeTitle()">
                <text :value="title">
            </h1>
            <ul>
                <li :each="books as book index" :click="showName()">
                    <text :value="index +': '+ book.name">
                    <button :click="removeBook()">删除</button>
                </li>
            </ul>

            <button :click="addNewBook()">插入新数据</button>
            <button :click="updateByFilter()">筛选更新</button>
        </div>
    `,
    datas: {
        PI: Math.PI,
        color: dva.types.string('blue'),
        title: dva.types.string('这是一个残忍的世界'),

        books: dva.types.array({}, [
            { name: '孙子兵法', price: 999, pages: [], isEnabled: true },
            { name: '红楼梦', price: 999, pages: [], isEnabled: true },
            { name: '孙子兵法2', price: 999, pages: [], isEnabled: true },
        ]),
    },
    actions: {
        main () {
            this.mount(document.getElementById('app'))
        },
        changeTitle () {
            this.datas('title').update('xxx')
        },

        showName () {
            this.datas('book.name').update(`#${this.datas('book.name').value()}`)
        },

        addNewBook () {
            this.datas('books').inserts([
                { name: `xxx1${Date.now()}` },
            ])
        },

        removeBook () {
            this.datas('book').remove()
        },

        updateByFilter () {
            this.datas('books.name', 'books.name=="红楼梦"').update('***')
        },

    },
})
