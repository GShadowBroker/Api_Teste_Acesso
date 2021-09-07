# Teste Técnico - BackEnd #VemSerAcesso
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
```
| Variável | Descrição                    |
| ------------- | ------------------------------ |
| MONGODB_URI      | A URI com as credenciais para acesso ao banco de dados do MongoDB Atlas.       |
| SERVER_BASE_URL   | A URL da API para a qual serão consultados o saldo, a conta e feita a transferência.     |
| HOST_URL   | A URL base desta aplicação.     |


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
    "message": string
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

Parâmetro  | Tipo | Descrição
------------- | ------------- | ---------
accountOrigin  | string | Conta de onde o valor será transferido.
accountDestination  | string | Conta para a qual o valor será transferido.
value  | number | Valor a ser transferido.


### Resposta:

`200 OK`
```javascript
{
  "transactionId": "2d4d97f7-dd9a-46f0-baa7-2045c0882e63"
}
```

Parâmetro  | Tipo | Descrição
------------- | ------------- | ---------
transactionId  | string | ID da transferência.


