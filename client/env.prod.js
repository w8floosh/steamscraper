const env = require('dotenv').config({ path: `./.env.${process.env.ENVIRONMENT.toLowerCase()}` }).parsed;
module.exports = {
    quasarAppCertificatePath: env.CERT_PATH,
    quasarAppCertificateKeyPath: env.CERTKEY_PATH,
    quasarAppEnvironment: env.NODE_ENV,
}
