const {stats} = require('./routes/stats')

let previousState = []

const routes = {stats}

const changeState = (newState) => {
    const makeChange = () => {
        previousState.push(document.body.className)
        document.body.className = newState
    }

    if (newState in routes) {
        routes[newState](makeChange)
    } else {
        makeChange()
    }
}
const backState = () => {
    changeState(previousState.pop())
}

module.exports = {changeState, backState}