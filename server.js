const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const pool = require('./db'); // Подключение к базе данных
const quizRoutes = require('./quizzes');

const app = express();
app.use(express.static(path.join(__dirname))); // Разрешить статические файлы
app.use(bodyParser.urlencoded({ extended: true })); // Для парсинга данных форм

// Используем встроенные функции для обработки JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Роуты для работы с квизами
app.use('/api/quizzes', quizRoutes);

// Конфигурация multer для сохранения файлов в папке "doc"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'doc'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Страница входа
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Страница для готового квиза
app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'quiz.html'));
});

// Страница для создания квизов
app.get('/create-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'create-quiz.html'));
});

// Страница админа квизов
app.get('/admin-quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-quiz.html'));
});

// Страница результатов квизов
app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'rezults-quiz.html'));
});

// Страница экотропы акташский провал квизов
app.get('/actashski-proval', (req, res) => {
    res.sendFile(path.join(__dirname, 'Actshski-proval.html'));
});

// Эндпоинт для проверки пользователя
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM participants WHERE username = ? AND password = ?';
        const [rows] = await pool.query(query, [username, password]);

        if (rows.length > 0) {
            // Успешный вход, перенаправление на страницу участников
            res.redirect('/participants');
        } else {
            // Неверный логин или пароль
            res.status(401).send('Ошибка: Неверный логин или пароль.');
        }
    } catch (err) {
        console.error('Ошибка при проверке пользователя:', err);
        res.status(500).send('Ошибка сервера');
    }
});

// Страница участников
app.get('/participants', (req, res) => {
    res.sendFile(path.join(__dirname, 'participants.html'));
});

// Эндпоинт для загрузки файлов
app.post('/upload', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Ошибка загрузки файла');
    }

    const filename = req.file.originalname;
    const fileUrl = `https://yungelgeo.ru/doc/${filename}`;

    try {
        const query = 'INSERT INTO document (filename, url) VALUES (?, ?)';
        await pool.query(query, [filename, fileUrl]);
        res.redirect('/participants');
    } catch (err) {
        console.error('Ошибка сохранения файла в базе данных:', err);
        res.status(500).send('Ошибка сервера');
    }
});

// Эндпоинт для получения списка документов
app.get('/documents', async (req, res) => {
    try {
        const [documents] = await pool.query('SELECT * FROM document');
        res.json(documents);
    } catch (err) {
        console.error('Ошибка загрузки документов:', err);
        res.status(500).send('Ошибка сервера');
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}/`);
});
