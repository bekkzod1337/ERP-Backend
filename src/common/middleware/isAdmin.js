// isAdmin.js
import jwt from 'jsonwebtoken';
import getConfig from '../config/config.service.js';


export function isAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, getConfig("JWT_ACCESS_SECRET"), (err, user) => {
        if (err || user.role !== 'admin') {
            return res.sendStatus(403);
        }
        next();
    });
}
