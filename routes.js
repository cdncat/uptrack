let previousState

const routes = {
    'stats': (cb) => {
        cb()
    }
}

const changeState = (newState) => {
    const makeChange = () => {
        previousState = document.body.className
        document.body.className = newState
    }

    if (newState in routes) {
        routes[newState](makeChange)
    } else {
        makeChange()
    }
}
const backState = () => {
    changeState(previousState)
}

module.exports = {changeState, backState}