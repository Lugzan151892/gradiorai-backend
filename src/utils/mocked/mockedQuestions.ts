const questions = [
  {
    question: 'Что такое тестирование ПО?',
    responses: [
      {
        answer: 'Процесс написания кода',
        correct: false,
      },
      {
        answer: 'Процесс проверки соответствия ПО требованиям',
        correct: true,
      },
      {
        answer: 'Разработка нового функционала',
        correct: false,
      },
      {
        answer: 'Мониторинг серверов',
        correct: false,
      },
    ],
  },
  {
    question: 'Что такое баг в ПО?',
    responses: [
      {
        answer: 'Желательная функция',
        correct: false,
      },
      {
        answer: 'Неожиданное поведение программы',
        correct: true,
      },
      {
        answer: 'Документ для тестирования',
        correct: false,
      },
      {
        answer: 'Инструмент автоматизации',
        correct: false,
      },
    ],
  },
  {
    question: 'Какой документ содержит шаги тестирования и ожидаемый результат?',
    responses: [
      {
        answer: 'Баг-репорт',
        correct: false,
      },
      {
        answer: 'Тест-кейс',
        correct: true,
      },
      {
        answer: 'Чек-лист',
        correct: false,
      },
      {
        answer: 'User Story',
        correct: false,
      },
    ],
  },
  {
    question: 'Какой метод тестирования использует знание кода?',
    responses: [
      {
        answer: 'Black Box',
        correct: false,
      },
      {
        answer: 'White Box',
        correct: true,
      },
      {
        answer: 'Grey Box',
        correct: false,
      },
      {
        answer: 'Smoke Testing',
        correct: false,
      },
    ],
  },
  {
    question: 'Что из этого не является фазой тестирования?',
    responses: [
      {
        answer: 'Юнит-тестирование',
        correct: false,
      },
      {
        answer: 'Деплоймент',
        correct: true,
      },
      {
        answer: 'Интеграционное тестирование',
        correct: false,
      },
      {
        answer: 'Сквозное тестирование',
        correct: false,
      },
    ],
  },
  {
    question: 'Что такое smoke-тестирование?',
    responses: [
      {
        answer: 'Проверка интерфейса',
        correct: false,
      },
      {
        answer: 'Тестирование стабильности сборки',
        correct: true,
      },
      {
        answer: 'Автоматическое тестирование',
        correct: false,
      },
      {
        answer: 'Нагрузочное тестирование',
        correct: false,
      },
    ],
  },
  {
    question: 'Что делать, если баг невозможно воспроизвести?',
    responses: [
      {
        answer: 'Закрыть баг',
        correct: false,
      },
      {
        answer: 'Попросить помощь у коллег',
        correct: true,
      },
      {
        answer: 'Игнорировать баг',
        correct: false,
      },
      {
        answer: "Описать его как 'не баг'",
        correct: false,
      },
    ],
  },
  {
    question: 'Какой из инструментов используется для баг-трекинга?',
    responses: [
      {
        answer: 'Figma',
        correct: false,
      },
      {
        answer: 'Jira',
        correct: true,
      },
      {
        answer: 'Jenkins',
        correct: false,
      },
      {
        answer: 'Postman',
        correct: false,
      },
    ],
  },
  {
    question: "Какой HTTP-код означает 'Not Found'?",
    responses: [
      {
        answer: '403',
        correct: false,
      },
      {
        answer: '404',
        correct: true,
      },
      {
        answer: '502',
        correct: false,
      },
      {
        answer: '401',
        correct: false,
      },
    ],
  },
  {
    question: 'Что такое regression-тестирование?',
    responses: [
      {
        answer: 'Тестирование нового функционала',
        correct: false,
      },
      {
        answer: 'Проверка, что изменения не сломали существующий код',
        correct: true,
      },
      {
        answer: 'Одноразовое тестирование',
        correct: false,
      },
      {
        answer: 'Автоматизированное тестирование',
        correct: false,
      },
    ],
  },
  {
    question: 'Какой инструмент используется для API-тестирования?',
    responses: [
      {
        answer: 'Selenium',
        correct: false,
      },
      {
        answer: 'Postman',
        correct: true,
      },
      {
        answer: 'Git',
        correct: false,
      },
      {
        answer: 'Figma',
        correct: false,
      },
    ],
  },
  {
    question: 'Какой тест выполняется без подготовки и тест-кейсов?',
    responses: [
      {
        answer: 'Регрессионное',
        correct: false,
      },
      {
        answer: 'Исследовательское (Exploratory)',
        correct: true,
      },
      {
        answer: 'Интеграционное',
        correct: false,
      },
      {
        answer: 'Smoke-тестирование',
        correct: false,
      },
    ],
  },
  {
    question: "Что означает 'shift-left testing'?",
    responses: [
      {
        answer: 'Тестирование в продакшене',
        correct: false,
      },
      {
        answer: 'Раннее тестирование на стадии разработки',
        correct: true,
      },
      {
        answer: 'Отложенное тестирование',
        correct: false,
      },
      {
        answer: 'Удаление багов перед тестированием',
        correct: false,
      },
    ],
  },
];

export default questions;
