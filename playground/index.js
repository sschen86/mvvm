import dva from '../src/index'
import './compiler-test'

eg1()


function eg1 () {
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
}


function eg2 () {
    let books = [
        {
            name: '三国演义',
            price: 99,
            pages: [
                { num: 1, content: '桃园三结义' },
                { num: 2, content: '三英战吕布' },
                { num: 3, content: '温酒斩华雄' },
                { num: 4, content: '过五关 斩六将' },
            ],
            isEnabled: true,
        },
        {
            name: '水浒传',
            price: 999,
            pages: [
                { num: 1, content: '武松打虎' },

            ],
            isEnabled: true,
        },
        {
            name: '神雕侠侣', price: 222, pages: [], isEnabled: true,
        },
    ]

    const books3 = [
        {
            name: '三国演义',
            price: 99,
            pages: [
            ],
        },
        {
            name: '水浒传',
            price: 880,
            pages: [

            ],
        },
    ]

    !(function () {
    // return
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        books = books.concat(books)
        // books = books.concat(books)
        // books = books.concat(books)
        // books = books.concat(books)
        // books = books.concat(books)
        // books.unshift({name:'西游记', price:999, pages:[]})
        // books = books.concat(books)
        // books = books.concat(books)
    }())


    dva({
        template2: `
            <h2><text :value="title"></h2>
            dsdssd <text :value="PI + 3"> 222
            <:if="PI > 0">
            3333
                <div :each="books as book" style="border:1px solid #000; padding:10px; margin:10px" :class="containerClassName">
                    书名：《<text :value="book.name">》<br>
                    价格：￥<text :value="book.price">
                    <div :each="book.pages as page" :if=" PI > 0 "   style="border:1px solid red">
                        <p style="border:4px solid #000; margin:3px; padding:4px;" >页码:            <text :value="page.num"></p>
                        <p style="border:4px solid #000; margin:3px; padding:4px;" :click="changeContext()">内容: <text :value="page.content"></p>
                    </div>
                    <p :if="1">111</p>
                    <p :elseif="PI == 0">111</p>
                    <p :elseif="PI == 0">222</p>
                    <p :elseif="PI > 0">3333</p>
                    <text :value="JSON.stringify(book)">
                </div>
            </>
        `,
        template: `
            <button :click="insertNewBook()">插入新数据</button>
            <button :click="toggleVisibleBook()">切换显示孙子兵法</button>
            <div :each="books as book" :click="changeBookName()" style="border:1px solid #000; margin:4px" :if="book.isEnabled">
                <div style="border:3px solid #ccc; margin:6px">书名：《<text :value="book.name">》</div>
                <div style="border:3px solid #ccc; margin:6px">价格：￥<text :value="book.price"></div>
                <div :each="book.pages as page" :if=" PI > 0 "   style="border:1px solid red">
                    <p style="border:4px solid #000; margin:3px; padding:4px;" >页码:            <text :value="page.num"></p>
                    <p style="border:4px solid #000; margin:3px; padding:4px;" :click="changeContext()">内容: <text :value="page.content"></p>
                </div>
                <div>
                    <button :click="moveUp()">上移</button>
                    <button :click="moveDown()">下移</button>
                    <button :click="removeBook()">移除</button>
                </div>
           </div>
        `,
        template33: `
            <button>插入新数据</button>
            <button>交互数据位置</button>
        `,
        template3: `
            <button :click="updateBookName1()">更新西游记为红楼梦</button>
            <button :click="updateAllBookPrice()">更新所有书本的价格</button>
            <p :each="books as book index" if="index%2 === 0" style="border:1px solid #000; padding:10px; margin:10px">
                书名：《<text :value="book.name">》<br>
                价格：￥<text :value="book.price">
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
                <a href="http://www.571xz.com">sijjsjkas</a>
            </p>
        `,
        datas: {
            PI: Math.PI,
            color: dva.types.string('blue'),
            title: dva.types.string('这是一个残忍的世界'),
            ju: dva.types.object({
                isEnabled: dva.types.boolean(),
            }, {
                isEnabled: false,
            }),
            // isEnabled: dva.types.boolean(),
            userName: '李小龙',
            goodslist: [
                { name: 'xx' },
                { name: 'yy' },
            ],
            books: dva.types.array({
                name: dva.types.string(),
                price: dva.types.number(),
                pages: dva.types.array({
                    num: dva.types.number(),
                    content: dva.types.string(),
                }),
                isEnabled: dva.types.boolean(true),
            }, books),
            i: dva.types.number(0),
        },
        actions: {
            main () {
                this.mount(document.getElementById('app'))
            },
            toggleVisibleBook () {
                this.datas('books.isEnabled', 'books.name=="孙子兵法"').update(!this.datas('books.isEnabled', 'books.name=="孙子兵法"').value())
                // console.info(this.datas('books.isEnabled').value())
            },
            insertNewBook () {
                const i = this.datas('i').value()

                this.datas('books').inserts([
                    { name: '孙子兵法', price: 999, pages: [], isEnabled: true },
                    { name: '红楼梦', price: 999, pages: [], isEnabled: true },
                    { name: '孙子兵法', price: 999, pages: [], isEnabled: true },
                ], 1)
                this.datas('i').update(i + 1)
            },
            changeBookName () {
                console.info(this.datas('book.name').value())

                // this.datas('book.name').update(this.datas('book.name').value() + ''+ +new Date)
            },
            moveUp () {
                this.event().stopPropagation()
                this.datas('book').moveUp()
            },
            moveDown () {
                this.event().stopPropagation()
                this.datas('book').moveDown()
            },
            removeBook () {
                this.event().stopPropagation()
                this.datas('book').remove()
            },
            changeContext () {
                this.datas('book.pages').inserts([
                    { num: 9, content: '说好的呢' },
                    { num: 10, content: '结果呢' },
                    { num: 11, content: '还是变卦了吗' },
                ])

                // this.datas('books.pages.content', 'books.pages.num==1').update(+new Date +'xxx')
            },


            updateBookName1 () {
                this.datas('books.name', 'books.name=="西游记"').update('红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦红楼梦')
            },
            updateAllBookPrice () {
                this.datas('books.price').update(0.123456789 + Math.random())
            },
            toggleVisibleStory () {
                // console.info(this.datas('isEnabled'))
                // console.info(this.datas('goodslist2'))


                // component.dataUpdating()
                // component.domRepaint()
                /*
                if(this.state === 'listening'){
                    this.state = 'dataUpdating'
                }
                */

                // xxx.update({  })

                // 1. modifyData1
                // 2. modifyData2
                // 3. insertsData3
                // 4. removesData4


                this.datas('ju.isEnabled').update(!this.datas('ju.isEnabled').value())
                // this.datas('ju.isEnabled').update(!this.datas('ju.isEnabled').value())
                // this.datas('ju.isEnabled').update(!this.datas('ju.isEnabled').value())
                // this.datas('color').update('red')
            },
            updateBookName () {
                console.info(this.datas('books.name'))
                this.datas('books.name', 'books.name=="西游记"').update(`xxx${+new Date()}`())
            },
            loadGoodsList () {
                this.fetchx('//www.api.com/', function (resp) {
                    if (resp.err) {

                    } else {
                        this.datas('goodsList').inserts(resp.goodsList, function (err) {
                            err.preventDefault()
                        })


                        this.datas.transaction(function () {

                        }, function (err) {

                        })
                    }
                })
            },
            showThis () {
                console.info(this)
            },
        },
    })
}
