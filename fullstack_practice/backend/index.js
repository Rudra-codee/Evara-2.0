require('dotenv').config()
const bcrypt = require('bcrypt')
const express = require('express')
const { PrismaClient } = require('@prisma/client')
var jwt = require('jsonwebtoken');
const prisma = new PrismaClient()
const app = express()
app.use(express.json())

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (user) {
        return res.status(422).json({ message: "User Already exists" })
    } else {
        try {
            const hashedPassword = await bcrypt.hash(password, 10)

            const newUser = await prisma.user.create({
                data: {
                    name: name,
                    email: email,
                    password: hashedPassword
                }
            })
            const token = jwt.sign({ email: newUser.email }, process.env.SECRET_KEY)
            return res.status(200).json({ token: token, message: "User Created Successfully!" })

        } catch {
            return res.status(500).json({ message: "Something went wrong" })
        }
    }
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (!user) {
        return res.status(422).json({ message: "User does not exists" })
    } else {
        const isPasswrodMatch = bcrypt.compareSync(password, user.password);
        if (isPasswrodMatch) {
            const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY)
            return res.status(200).json({ token: token, email: email })
        } else {
            return res.status(401).json({ message: "Password is incorrect." })
        }
    }

})

function isValidToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
app.get("/users", isValidToken, async (req, res) => {
    const users = await prisma.user.findMany();
    return res.status(200).json(users)
})

app.listen(3000, () => {
    console.log('Server runnit')
})