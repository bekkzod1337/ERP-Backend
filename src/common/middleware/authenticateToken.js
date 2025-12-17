import jwt from 'jsonwebtoken';
import getConfig from "../../common/config/config.service.js";

export function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, getConfig("JWT_ACCESS_SECRET"), (err, user) => {
        if (err) return res.sendStatus(403); 
        req.user = user;
        next(); 
    });
}
