"""
Template do Contrato de Prestação de Serviços LuxePass
"""

CONTRACT_TEMPLATE = """
========================================
CONTRATO DE PRESTAÇÃO DE SERVIÇOS
LUXEPASS/GUESBET
CNPJ: 60.357.323/0001-69
========================================

CONTRATADA:
Razão Social: GUESBET SERVIÇOS DIGITAIS LTDA
Nome Fantasia: LUXEPASS
CNPJ: 60.357.323/0001-69
Endereço: Rua Exemplo, 123 - Centro, São Paulo - SP, CEP: 01000-000
Telefone: (11) 3000-0000
E-mail: contato@luxepass.com.br
Site: www.luxepass.com.br

CONTRATANTE:
Nome Completo: {user_full_name}
CPF: {user_cpf}
Data de Nascimento: {user_birth_date}
E-mail: {user_email}
Telefone: {user_phone}
Endereço: {user_address}

========================================
1. OBJETO DO CONTRATO
========================================

O presente contrato tem por objeto a prestação de serviços de acesso a 
academias parceiras, consultas com nutricionistas e personal trainers, 
através da plataforma LuxePass, conforme plano escolhido pelo CONTRATANTE.

========================================
2. PLANO CONTRATADO
========================================

PLANO ESCOLHIDO: {plan_name}

VALORES CONTRATADOS:
• Taxa de Adesão: R$ {activation_fee}
• Mensalidade: R$ {monthly_price}
• Primeiro Pagamento (Adesão + 1ª Mensalidade): R$ {first_payment_total}

BENEFÍCIOS INCLUSOS:
{plan_benefits}

FORMA DE PAGAMENTO ESCOLHIDA: {payment_method}

========================================
3. VIGÊNCIA E PERÍODO DE FIDELIDADE
========================================

3.1. INÍCIO DA VIGÊNCIA: {contract_start_date}

3.2. PERÍODO DE FIDELIDADE:
{fidelity_clause}

3.3. TÉRMINO DA VIGÊNCIA: {contract_end_date}

3.4. RENOVAÇÃO AUTOMÁTICA: 
Após o período de fidelidade, o contrato renova-se automaticamente 
por períodos mensais, até que o CONTRATANTE solicite o cancelamento.

========================================
4. PAGAMENTOS E COBRANÇA
========================================

4.1. VENCIMENTO MENSAL: 
Todo dia {billing_day} de cada mês (mesma data do primeiro pagamento)

4.2. MÉTODOS DE PAGAMENTO ACEITOS:
• PIX: Geração automática de QR Code na data de vencimento
• Cartão de Crédito: Débito automático no cartão cadastrado

4.3. COBRANÇA AUTOMÁTICA:
O CONTRATANTE {user_full_name}, CPF {user_cpf}, autoriza expressamente 
a LUXEPASS/GUESBET (CNPJ 60.357.323/0001-69) a realizar a cobrança 
automática mensal através do método de pagamento escolhido.

4.4. ALTERAÇÃO DE MÉTODO DE PAGAMENTO:
O CONTRATANTE pode alterar de PIX para Cartão de Crédito a qualquer 
momento através do aplicativo, na seção "Meu Plano".

========================================
5. INADIMPLÊNCIA E NEGATIVAÇÃO
========================================

5.1. PRAZO DE PAGAMENTO:
O pagamento deve ser efetuado até a data de vencimento mensal.

5.2. TENTATIVAS DE COBRANÇA:
Em caso de não pagamento, o sistema realizará:
• 1ª tentativa: No dia do vencimento
• 2ª tentativa: 3 (três) dias após a 1ª tentativa
• 3ª tentativa: 3 (três) dias após a 2ª tentativa

5.3. BLOQUEIO DE ACESSO:
Após 3 (três) tentativas falhadas de cobrança, os seguintes serviços 
serão BLOQUEADOS automaticamente:
• Geração de token de acesso às academias
• Agendamento de consultas com nutricionistas
• Agendamento de consultas com personal trainers

5.4. MULTA POR INADIMPLÊNCIA:
Em caso de atraso no pagamento, será aplicada multa de 2% (dois por cento) 
sobre o valor da mensalidade, acrescida de juros de mora de 1% (um por cento) 
ao mês ou fração.

EXEMPLO DE CÁLCULO PARA SEU PLANO:
Plano {plan_name} - Mensalidade: R$ {monthly_price}
Atraso de 30 dias:
• Valor da mensalidade: R$ {monthly_price}
• Multa (2%): R$ {late_fee_2_percent}
• Juros (1%): R$ {late_fee_1_percent}
• TOTAL A PAGAR: R$ {total_with_late_fees}

5.5. NEGATIVAÇÃO:
⚠️ IMPORTANTE: Após 30 (trinta) dias de inadimplência, o CONTRATANTE 
{user_full_name}, CPF {user_cpf}, autoriza expressamente a 
LUXEPASS/GUESBET (CNPJ 60.357.323/0001-69) a incluir seu nome e CPF nos 
cadastros de proteção ao crédito (SPC, SERASA, BOA VISTA), conforme 
previsto no Art. 43 do Código de Defesa do Consumidor (CDC).

O CONTRATANTE será notificado previamente no e-mail {user_email} e 
telefone {user_phone} sobre a inclusão nos órgãos de proteção ao 
crédito com antecedência mínima de 10 (dez) dias.

========================================
6. CANCELAMENTO E MULTA RESCISÓRIA
========================================

6.1. CANCELAMENTO ANTES DO TÉRMINO DA FIDELIDADE:

{cancellation_policy}

EXEMPLOS DE CÁLCULO DE MULTA PARA SEU PLANO:

▶️ PLANO {plan_name} (R$ {monthly_price}/mês):

• Cancelamento no 3º mês → Faltam 9 meses
  Multa = 9 × R$ {monthly_price} = R$ {fine_month_3}

• Cancelamento no 6º mês → Faltam 6 meses
  Multa = 6 × R$ {monthly_price} = R$ {fine_month_6}

• Cancelamento no 9º mês → Faltam 3 meses
  Multa = 3 × R$ {monthly_price} = R$ {fine_month_9}

• Cancelamento após 12º mês → {no_fine_clause}

6.2. CANCELAMENTO APÓS FIDELIDADE:
Após cumprido o período de fidelidade, o CONTRATANTE pode cancelar 
a qualquer momento sem qualquer ônus, mediante aviso prévio de 30 dias.

6.3. PROCEDIMENTO DE CANCELAMENTO:
O cancelamento deve ser solicitado através do aplicativo LuxePass, 
na seção "Meu Plano" > "Cancelar Assinatura".

========================================
7. OBRIGAÇÕES DO CONTRATANTE
========================================

7.1. Manter seus dados cadastrais atualizados
7.2. Efetuar os pagamentos nas datas de vencimento
7.3. Utilizar os serviços de acordo com as políticas da LuxePass
7.4. Respeitar as regras de cada academia parceira
7.5. Não compartilhar credenciais de acesso com terceiros
7.6. Informar imediatamente qualquer alteração de dados cadastrais

========================================
8. OBRIGAÇÕES DA LUXEPASS/GUESBET
========================================

8.1. Garantir acesso às academias parceiras conforme o plano contratado
8.2. Fornecer suporte técnico através dos canais oficiais
8.3. Notificar previamente sobre cobranças e vencimentos
8.4. Manter a privacidade dos dados do CONTRATANTE conforme LGPD
8.5. Enviar comprovantes de pagamento para o e-mail {user_email}

========================================
9. PROTEÇÃO DE DADOS (LGPD)
========================================

A LUXEPASS/GUESBET (CNPJ 60.357.323/0001-69) compromete-se a proteger 
os dados pessoais do CONTRATANTE em conformidade com a Lei Geral de 
Proteção de Dados (LGPD - Lei nº 13.709/2018).

DADOS COLETADOS:
• Nome completo: {user_full_name}
• CPF: {user_cpf}
• E-mail: {user_email}
• Telefone: {user_phone}
• Endereço: {user_address}
• Data de nascimento: {user_birth_date}
• Dados de pagamento (tokenizados e criptografados)

Os dados coletados serão utilizados exclusivamente para:
• Prestação dos serviços contratados
• Cobrança de mensalidades
• Comunicação sobre o serviço
• Cumprimento de obrigações legais

========================================
10. FORO
========================================

Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer 
controvérsias oriundas do presente contrato.

========================================
11. DECLARAÇÕES DO CONTRATANTE
========================================

Ao aceitar este contrato, o CONTRATANTE {user_full_name}, CPF {user_cpf}, 
declara que:

✓ É MAIOR DE 18 (DEZOITO) ANOS, nascido(a) em {user_birth_date}, 
  e está em pleno gozo de suas faculdades mentais e capacidade civil

✓ Leu integralmente e compreendeu todos os termos deste contrato

✓ Está ciente do período de fidelidade de {fidelity_months} meses

✓ Está ciente da multa rescisória em caso de cancelamento antecipado

✓ Está ciente da possibilidade de negativação em caso de inadimplência

✓ Autoriza a cobrança automática mensal no método de pagamento escolhido

✓ Autoriza o envio de comunicações para o e-mail {user_email} 
  e telefone {user_phone}

✓ Todas as informações fornecidas são verdadeiras e corretas

========================================
12. ACEITAÇÃO ELETRÔNICA
========================================

A marcação da caixa de seleção abaixo equivale à assinatura digital 
deste contrato, nos termos do Art. 10 da Medida Provisória nº 2.200-2/2001.

DADOS DA ACEITAÇÃO:
Data e Hora: {acceptance_timestamp}
IP do Dispositivo: {acceptance_ip}
Dispositivo: {device_info}
Contratante: {user_full_name}
CPF: {user_cpf}

☐ DECLARO QUE SOU {user_full_name}, CPF {user_cpf}, MAIOR DE 18 ANOS, 
   LI E ACEITO TODOS OS TERMOS DESTE CONTRATO DE PRESTAÇÃO DE SERVIÇOS

========================================
CONTRATADA
LUXEPASS/GUESBET
CNPJ: 60.357.323/0001-69

CONTRATANTE
{user_full_name}
CPF: {user_cpf}
E-mail: {user_email}
========================================
"""
