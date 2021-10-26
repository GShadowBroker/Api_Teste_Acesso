# NestJS API BackEnd
> REST API para transferência de valores entre duas contas. Esta API oferece endpoints para solicitação e consulta de transferência, e faz uso da [API de conta](https://acessoaccount.herokuapp.com/swagger/index.html) fornecida pelo teste para consultar contas, saldo e fazer movimentação financeira.

## Tecnologias usadas:
- NestJS
- MongoDB
- TypeScript

## Instalação

Clone o repositório:
`$ git clone https://github.com/GShadowBroker/Api_Teste_Acesso.git`


Entre na pasta do projeto e instale as dependências:
`$ cd Api_Teste_Acesso && npm install`


Crie um arquivo `.env` e insira as variáveis:
```
	MONGODB_URI=
  SERVER_BASE_URL=https://acessoaccount.herokuapp.com/api/Account
  HOST_URL=https://teste-acesso.herokuapp.com/
  SENDGRID_ACCESS_KEY=
  FROM_EMAIL=

```
| Variável | Descrição                    |
| ------------- | ------------------------------ |
| MONGODB_URI      | A URI com as credenciais para acesso ao banco de dados do MongoDB Atlas.       |
| SERVER_BASE_URL   | A URL da API para a qual serão consultados o saldo, a conta e feita a transferência.     |
| HOST_URL   | A URL base desta aplicação.     |
| SENDGRID_ACCESS_KEY   | Chave da API do SendGrid para envio de notificações por e-mail.     |
| FROM_EMAIL   | E-mail sob o qual os e-mails serão enviados.     |


Inicie o servidor de desenvolvimento:
`$ npm run start:dev`

![](https://i.imgur.com/DZr3LLR.png)


## REST API
Os endpoints da API estão descritos abaixo:


### Solicitar status da transação:

`GET https://teste-acesso.herokuapp.com/api/fund-transfer/{{ transactionId }}`


Parâmetro  | Tipo | Descrição
------------- | ------------- | ----------
transactionId  | string | ID da transferência a ser usado para consulta do status.


### Resposta:

`200 OK`
```javascript
{
    "status": "In Queue"
}
```

### ou

`200 OK`
```javascript
{
    "status": "Error",
    "message": "Insufficient funds on account origin to achieve this transaction"
}
```

Parâmetro  | Tipo | Descrição
------------- | ------------- | ---------
status  | string | Status atual da transação. Pode ser "In Queue", "Processing", "Confirmed" ou "Error".
message | string ou null | Se o status for "Error", mensagem explicando o erro.

### Fazer nova transação:

`POST https://teste-acesso.herokuapp.com/api/fund-transfer`

### Exemplo de Body:

```javascript
Content-Type: application/json
{
  "accountOrigin": "22925432",
  "accountDestination": "01920461",
  "value": 50.0
}
```
### ou opcionalmente

```javascript
Content-Type: application/json
{
  "accountOrigin": "22925432",
  "accountDestination": "01920461",
  "value": 50.0,
  "email": "example@email.com"
}
```


Parâmetro  | Tipo | Descrição
------------- | ------------- | ---------
accountOrigin  | string | Conta de onde o valor será transferido.
accountDestination  | string | Conta para a qual o valor será transferido.
value  | number | Valor a ser transferido.
email  | string ou null | Campo opcional de e-mail para notificação sobre a transação.


### Resposta:

`201 CREATED`
```javascript
{
  "transactionId": "2d4d97f7-dd9a-46f0-baa7-2045c0882e63"
}
```

Parâmetro  | Tipo | Descrição
------------- | ------------- | ---------
transactionId  | string | ID da transferência.


