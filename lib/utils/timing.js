module.exports = {
    milliseconds: async ms => await new Promise(fullfill => setTimeout(fullfill, ms))
};