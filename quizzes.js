const express = require('express');
const pool = require('./db');
const router = express.Router();

// Получить все квизы
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM quizzes');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать новый квиз
router.post('/', async (req, res) => {
    const { name, description, questions } = req.body;

    try {
        // Вставляем квиз в базу данных
        const [result] = await pool.query('INSERT INTO quizzes (name, description) VALUES (?, ?)', [name, description]);
        const quizId = result.insertId;

        // Обрабатываем вопросы
        for (const question of questions) {
            // Вставляем вопрос (с временным значением correct_option_id)
            const [questionResult] = await pool.query(
                'INSERT INTO questions (quiz_id, text, time_limit, correct_option_id) VALUES (?, ?, ?, NULL)',
                [quizId, question.text, question.timeLimit]
            );
            const questionId = questionResult.insertId;

            let correctOptionId = null;
            const options = question.options;

            // Вставляем варианты ответов
            for (const option of options) {
                const { text, isCorrect } = option;

                // Вставляем вариант ответа, включая правильность
                const [optionResult] = await pool.query(
                    'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
                    [questionId, text, isCorrect ? 1 : 0] // 1 если правильный, 0 если неправильный
                );
                const optionId = optionResult.insertId;

                // Проверяем, если это правильный вариант, то сохраняем его ID
                if (isCorrect) {
                    correctOptionId = optionId;
                }
            }

            // Обновляем правильный вариант ответа для вопроса
            if (correctOptionId !== null) {
                await pool.query(
                    'UPDATE questions SET correct_option_id = ? WHERE id = ?',
                    [correctOptionId, questionId]
                );
            } else {
                // Если не выбран правильный ответ, выбрасываем ошибку
                throw new Error('No correct answer selected for question: ' + question.text);
            }
        }

        res.status(201).json({ message: 'Quiz created successfully', quizId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// Удалить квиз
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Удаляем связанные данные
        await pool.query('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [id]);
        await pool.query('DELETE FROM questions WHERE quiz_id = ?', [id]);
        await pool.query('DELETE FROM quizzes WHERE id = ?', [id]);

        res.status(200).json({ message: 'Quiz deleted successfully' });
    } catch (err) {
        console.error('Error deleting quiz:', err);
        res.status(500).json({ error: err.message });
    }
});

// Получить квиз по ID, включая варианты ответов
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Получаем квиз
        const [quiz] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [id]);
        
        if (!quiz.length) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Получаем вопросы и варианты для каждого вопроса
        const [questions] = await pool.query(
            `SELECT q.id as question_id, q.text as question_text, q.time_limit, o.id as option_id, o.text as option_text, o.is_correct
             FROM questions q
             LEFT JOIN options o ON q.id = o.question_id
             WHERE q.quiz_id = ?`, [id]
        );

        // Формируем структуру вопросов с вариантами
        const quizData = {
            ...quiz[0],
            questions: []
        };

        // Группируем варианты по вопросам
        questions.forEach(question => {
            const questionIndex = quizData.questions.findIndex(q => q.id === question.question_id);

            if (questionIndex === -1) {
                quizData.questions.push({
                    id: question.question_id,
                    text: question.question_text,
                    time_limit: question.time_limit,
                    options: [{
                        id: question.option_id,
                        text: question.option_text,
                        is_correct: question.is_correct
                    }]
                });
            } else {
                quizData.questions[questionIndex].options.push({
                    id: question.option_id,
                    text: question.option_text,
                    is_correct: question.is_correct
                });
            }
        });

        // Отправляем данные квиза
        res.json(quizData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/results', async (req, res) => {
    const { quizId, teamName, correctAnswers, totalQuestions } = req.body;

    try {
        const query = 'INSERT INTO results (quiz_id, team_name, correct_answers, total_questions) VALUES (?, ?, ?, ?)';
        await pool.query(query, [quizId, teamName, correctAnswers, totalQuestions]);
        res.status(201).json({ message: 'Result saved successfully' });
    } catch (err) {
        console.error('Error saving result:', err);
        res.status(500).json({ error: 'Failed to save result' });
    }
});

// Получить таблицу результатов для квиза
router.get('/:quizId/results', async (req, res) => {
    const { quizId } = req.params;

    try {
        const [results] = await pool.query(
            `SELECT team_name, correct_answers, total_questions 
             FROM results 
             WHERE quiz_id = ?`, [quizId]
        );

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
