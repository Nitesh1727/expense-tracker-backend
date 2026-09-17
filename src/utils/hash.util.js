import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const compareHash = (plain, hashed) => bcrypt.compare(plain, hashed);

export { hash, compareHash };
