import jwt from 'jsonwebtoken'


export class JsonWebToken{

    static generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
}

static veriFyToken(token){
    return jwt.verify(token , process.env.JWT_SECRET)
}
}

