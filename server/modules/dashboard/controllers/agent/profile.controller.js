/*
    @author: dientn
    get user info
*/
exports.profile = (req, res, next) =>{
    res.json(req.user);
};