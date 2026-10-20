const fail = async () => {
  const e = new Error('La versión de prueba en el navegador no envía correos reales. En la app de tu PC sí se envían.');
  e.code = 'DEMO';
  throw e;
};
module.exports = { createTransport: () => ({ sendMail: fail, verify: fail }) };
