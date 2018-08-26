const getId = (id) => document.getElementById(id)
const getClass = (cls, fn) => [...document.getElementsByClassName(cls)].forEach(fn)
const $click = (id, listener) => {
    getId(id).addEventListener('click', listener)
}
const $$click = (cls, listener) => {
    getClass(cls, $el => {
        $el.addEventListener('click', listener)
    })
}

module.exports = {
    '$': getId,
    '$$': getClass,
    $click,
    $$click
}