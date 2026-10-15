const form = document.querySelector('#cadastro-form');
const phoneInput = document.querySelector('#telefone');
const message = document.querySelector('#form-message');
const submitButton = form.querySelector('button[type="submit"]');

phoneInput.addEventListener('input', () => {
  const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) phoneInput.value = digits;
  else if (digits.length <= 6) phoneInput.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  else if (digits.length <= 10) phoneInput.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  else phoneInput.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'message';
  message.textContent = '';

  if (!form.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Enviando...';

  try {
    const response = await fetch('/api/cadastros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível realizar o cadastro.');

    form.reset();
    message.textContent = 'Tudo certo! Seu cadastro foi realizado com sucesso.';
    message.className = 'message message--success';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message message--error';
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Finalizar cadastro';
  }
});
