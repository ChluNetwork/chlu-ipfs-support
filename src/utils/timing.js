module.exports = {
    milliseconds: async ms => await new Promise(resolve => setTimeout(resolve, ms))
};