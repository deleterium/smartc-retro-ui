import { SmartC } from 'smartc-signum-compiler'
import sah from 'smartc-assembly-highlight'

/* Following global functions are define on the files:
CodeMirror      -> 3rd-party/codemirror/lib/codemirror.js
shortcut        -> 3rd-party/shortcut.js
*/

/* global CodeMirror shortcut */

const PageGlobal = {
    resizerInterval: undefined,
    colorMode: 'source',
    colorToggleTimeout: 0,
    myCodeMirror: undefined,
    defaultFontFamily: undefined,
    defaultFontSize: undefined
}

window.onload = () => {
    PageGlobal.defaultFontFamily = document.body.style.fontFamily
    PageGlobal.defaultFontSize = document.body.style.fontSize

    document.getElementById('help').addEventListener('click', OpenHelp)
    document.getElementById('compile').addEventListener('click', compileCode)
    document.getElementById('save').addEventListener('click', SaveSource)
    document.getElementById('load').addEventListener('click', LoadSource)
    document.getElementById('cbx_nostalgic_font').addEventListener('change', evtNostalgicFont)
    document.getElementById('cbx_disable_auto_save').addEventListener('change', evtDisableAutoSave)
    document.getElementById('copy_assembly').addEventListener('click', () => navigator.clipboard.writeText(document.getElementById('assembly_output').innerText))

    const cmParent = document.getElementById('tab-1-content')
    PageGlobal.myCodeMirror = CodeMirror(cmParent, {
        value: '',
        lineNumbers: true,
        lineWrapping: true,
        matchBrackets: true,
        mode: 'text/x-csrc',
        indentUnit: 4,
        autoCloseBrackets: true,
        showTrailingSpace: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
    })
    PageGlobal.myCodeMirror.setOption('theme', 'abcdef')

    const startUpTest = new SmartC({
        language: 'C',
        sourceCode: '#pragma version dev\n#pragma maxAuxVars 1\nlong a, b, c; a=b/~c;'
    })

    try {
        startUpTest.compile()
        if (startUpTest.getMachineCode().MachineCodeHashId === '7488355358104845254') {
            document.getElementById('status_output').innerHTML = '<span class="msg_success">Start up test done!</span>'
        } else {
            document.getElementById('status_output').innerHTML = '<span class="msg_failure">Start up test failed...</span>'
        }
    } catch (e) {
        document.getElementById('status_output').innerHTML = '<span class="msg_failure">Start up test crashed...</span>'
    }

    document.title = document.title.replace('%version%', startUpTest.getCompilerVersion())
    const h1TitleDom = document.getElementById('h1_title')
    h1TitleDom.innerHTML = h1TitleDom.innerHTML.replace('%version%', startUpTest.getCompilerVersion())

    shortcut.add('F1', OpenHelp)
    shortcut.add('F2', SaveSource)
    shortcut.add('F4', compileCode)
    shortcut.add('F8', LoadSource)

    loadOptions()
}

function loadOptions () {
    if (localStorage.getItem('disableAutoSave') !== 'true') {
        PageGlobal.myCodeMirror.setValue(localStorage.getItem('program'))
        PageGlobal.autoSaveTimer = setTimeout(autoSave, 15000)
        document.getElementById('cbx_disable_auto_save').checked = false
    } else {
        document.getElementById('cbx_disable_auto_save').checked = true
    }
    if (localStorage.getItem('nostalgic') === 'true') {
        document.getElementById('cbx_nostalgic_font').checked = true
        setNostalgicFont()
    } else {
        document.getElementById('cbx_nostalgic_font').checked = false
    }
}

function compileCode () {
    const codeString = PageGlobal.myCodeMirror.getValue()
    const t0 = new Date()

    try {
        const compiler = new SmartC({ language: 'C', sourceCode: codeString })
        compiler.compile()
        const asmCode = compiler.getAssemblyCode()
        const bcode = compiler.getMachineCode()

        sah.Config.preAll = ''
        sah.Config.preAll = ''
        sah.Config.preLine = ''
        sah.Config.postLine = '<br>'
        document.getElementById('assembly_output').innerHTML = sah.colorText(asmCode)

        const t1 = new Date()
        let compileMessage = `Compile sucessfull!!!<br>Done at ${t1.getHours()}:${t1.getMinutes()}:${t1.getSeconds()} in ${t1 - t0} ms.`
        compileMessage += `<br>Machine code hash ID: ${bcode.MachineCodeHashId}`
        tuiModalSuccessAlert(compileMessage)
        compileMessage += '\n\n' + JSON.stringify(bcode, null, '    ')
        document.getElementById('status_output').innerHTML = compileMessage

        // fillForm(bcode)
    } catch (e) {
        document.getElementById('assembly_output').innerHTML = ''
        // clearForm()
        let compileMessage = `Compile failed<br><br>${e.message}`
        tuiModalErrorAlert(compileMessage)
        compileMessage += '\n\n' + e.stack
        document.getElementById('status_output').innerHTML = compileMessage
        const lineError = /^At line: (\d+)/.exec(e.message)
        if (lineError !== null) {
            // const debug = PageGlobal.myCodeMirror.getScrollInfo()
            PageGlobal.myCodeMirror.addLineClass(Number(lineError[1] - 1), 'background', 'asmError')
            PageGlobal.myCodeMirror.scrollIntoView({ line: lineError[1] - 1, ch: 0 })
            setTimeout(() => {
                PageGlobal.myCodeMirror.removeLineClass(Number(lineError[1] - 1), 'background', 'asmError')
            }, 10000)
        }
    }
}

function autoSave () {
    const text = PageGlobal.myCodeMirror.getValue()
    localStorage.setItem('program', text)
    PageGlobal.autoSaveTimer = setTimeout(autoSave, 15000)
}

function OpenHelp () {
    const url = document.getElementById('help').getAttribute('data-content')
    window.open(url, '_blank').focus()
}

function SaveSource () {
    const dom = document.getElementById('save')
    const btnText = dom.innerHTML
    const newText = dom.getAttribute('data-clicked')
    localStorage.setItem('program', PageGlobal.myCodeMirror.getValue())
    setTimeout(() => {
        dom.innerHTML = btnText
    }, 5000)
    dom.innerHTML = newText
}

function LoadSource () {
    const dom = document.getElementById('load')
    const btnText = dom.innerHTML
    const newText = dom.getAttribute('data-clicked')
    PageGlobal.myCodeMirror.setValue(localStorage.getItem('program'))
    PageGlobal.myCodeMirror.focus()
    setTimeout(() => {
        dom.innerHTML = btnText
    }, 5000)
    dom.innerHTML = newText
}

function evtDisableAutoSave (ev) {
    if (ev.target.checked) {
        clearTimeout(PageGlobal.autoSaveTimer)
        localStorage.setItem('disableAutoSave', 'true')
    } else {
        PageGlobal.autoSaveTimer = setTimeout(autoSave, 15000)
        localStorage.setItem('disableAutoSave', 'false')
    }
}

function evtNostalgicFont (ev) {
    if (ev.target.checked) {
        setNostalgicFont()
    } else {
        setDefaultFont()
    }
}

function setNostalgicFont () {
    document.body.style.fontFamily = 'DOS'
    document.body.style.lineHeight = '1'
    localStorage.setItem('nostalgic', 'true')
}

function setDefaultFont () {
    document.body.style.fontFamily = PageGlobal.defaultFontFamily
    document.body.style.fontSize = PageGlobal.defaultFontSize
    document.body.style.lineHeight = ''
    localStorage.removeItem('nostalgic')
}

function tuiModalErrorAlert (text) {
    document.getElementById('modal_text').innerHTML = text
    const tuiOverlap = document.querySelector('.tui-overlap')
    if (!tuiOverlap) {
        // No overlap found element, return early and save a couple CPU cycles.
        return
    }
    // Show the overlap.
    tuiOverlap.classList.add('active')
    const modal = document.getElementById('modal')
    if (modal) {
        // Show it.
        modal.classList.add('active')
    }
    document.getElementById('close-modal').focus()
}

function tuiModalSuccessAlert (text) {
    document.getElementById('modal2_text').innerHTML = text
    const tuiOverlap = document.querySelector('.tui-overlap')
    if (!tuiOverlap) {
        // No overlap found element, return early and save a couple CPU cycles.
        return
    }
    // Show the overlap.
    tuiOverlap.classList.add('active')
    const modal = document.getElementById('modal2')
    if (modal) {
        // Show it.
        modal.classList.add('active')
    }
    document.getElementById('close-modal2').focus()
}
