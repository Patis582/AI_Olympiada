# Datový balíček – Linie ZDRAVÍ (Agent pro triáž pacientů)
### Česká AI olympiáda 2026 · národní finále · verze v0.1

> **Upozornění:** Veškerá data jsou **plně syntetická**. Klinické archetypy a priority jsou
> **pracovní návrh organizátorů, určený k revizi ČSAIM** – neslouží k reálnému použití ani
> jako lékařské doporučení. Žádná reálná pacientská data (GDPR, etika).

## Co je v balíčku

| Soubor | Co obsahuje |
|---|---|
| `patients_presentation.json` | Pacienti tak, jak je vidí každý: hlavní obtíž, symptomy, vitály, věk, pohlaví. |
| `patients_anamnesis.json` | Anamnéza (mini-EHR) klíčovaná přes ID. Dostanete ji jen **na vyžádání** (viz nástroj `get_history`). |
| `epidemiology.csv` | Aktuální výskyt respiračních onemocnění (úroveň vlny) podle data. |
| `practice_scenario.json` | Cvičná fronta pacientů k vyzkoušení vašeho agenta. |
| `tools.py` | Hotové rozhraní (nástroje), přes které agent k datům přistupuje. |
| `baseline_description.md` | Co dělá základní řešení, které máte překonat. |

**Skutečná priorita pacientů vám dodána není** – slouží k ověření vašeho řešení při hodnocení.

## Pravidlo, na kterém to celé stojí

Nespoléhejte jen na povrchovou prezentaci pacienta. Část případů má naléhavost skrytou
v **anamnéze** nebo v **epidemiologii** – vyplatí se aktivně ověřovat. Právě v tom je přidaná
hodnota agenta oproti statickým pravidlům.

## Nástroje (viz `tools.py`)

```
get_presentation(id)      -> symptomy + vitály (vidí každý)
get_history(id)           -> anamnéza z dostupných záznamů (NEzatěžuje pacienta)
get_epidemiology(datum)   -> aktuální výskyt respiračních onemocnění (NEzatěžuje pacienta)
ask_patient(id, otazka)   -> zeptá se přímo pacienta (vždy dostupné, ALE počítá se do zátěže pacienta)
lookup_guideline(symptom) -> pravidlo triážního standardu (placeholder – viz níže)
escalate(id, duvod)       -> předání lékaři (human-in-the-loop)
patient_burden()          -> kolik otázek jste dosud položili pacientům (nižší = lépe)
```

Řešení, které kouká jen na `get_presentation`, je **základní baseline**.
Dobrý agent orchestruje volání a eskaluje v nejistotě.

## Dohledat místo vyptávat – zátěž pacienta

Dnešní standard je **dotazník / symptom-checker na mobilu** v čekárně: vyptá se pacienta na
spoustu věcí. To je otravné a část lidí (typicky senioři) ho ani nevyplní. Váš agent má být
chytřejší: co jde, **si dohledá** (`get_history`, `get_epidemiology`) a pacienta se ptá
(`ask_patient`) jen tehdy, když to jinak nejde.

Vedle podhodnocení a propustnosti proto sledujeme i **zátěž pacienta** = počet otázek, které
musel pacient zodpovědět (`patient_burden()`). Není to cílová proměnná, ale je to **rozlišovací
ukazatel** – právě tím se odlišíte od dotazníku. Silný moment do pitche: *„dotazník se ptá na
12 věcí, náš agent na 2 – a triáží stejně dobře nebo líp."*

> **Pozn. k přístupu k datům:** výhoda „dohledám si to" platí jen tehdy, když k těm záznamům
> agent **má přístup**. Dotazník existuje právě proto, že data na vstupu často dostupná nejsou.
> Kdo a za jakých podmínek agentovi ten přístup zajistí, je součást vašeho byznys modelu i etiky.

## Přístupnost a inkluze

Zamyslete se, **koho dnešní dotazník na mobilu vylučuje** – seniory, lidi s horší motorikou
či zrakem, cizojazyčné, vystresované. Řešení, které umí přijmout vstup i jinak (hlasem,
v přirozené řeči, v asistovaném režimu), má reálnou unikátní hodnotu. **Forma je na vás**
(hlasový asistent, kiosek u vstupu, asistovaný režim přes sestru). Fyzický humanoid/robot
není zakázaný, ale nese stejnou laťku jako kamera – musíte unést náklady, bezpečnost
i odpovědnost, jinak je to slabina, ne plus.

## Triážní škála

Prioritu definujte podle **platného českého triážního standardu** – ten si jako součást
úlohy **dohledejte sami** (vodítko: doporučené postupy pro organizaci urgentních příjmů,
SUMMK ČLS JEP / ÚZIS; jednotná triáž platná od 2026). `lookup_guideline` je jen placeholder,
který nahradíte vlastní rešerší.

## Jak se hodnotí úspěch

Váš agent i základní řešení projdou stejnou frontu pacientů. Porovná se přiřazená priorita
se skutečnou naléhavostí a spočítají se:

- **podhodnocení rizikových** – kolik vážně nemocných šlo do nízké priority (chceme co nejníž),
- **propustnost / over-triáž** – jestli neoznačujete urgentně i lehké případy,
- **zátěž pacienta** – kolik otázek musel pacient zodpovědět (rozlišovací ukazatel).

Rozdíl mezi vaším agentem a základním řešením je to, co dokazuje přidanou hodnotu – a co
ukážete v živém demu.

## Rychlý start

```python
from tools import get_presentation, get_history, get_epidemiology, escalate
import json

fronta = json.load(open("practice_scenario.json", encoding="utf-8"))["fronta"]
for pid in fronta:
    pres = get_presentation(pid)
    # ... vaše logika: kdy zavolat get_history? kdy get_epidemiology? kdy escalate? ...
```
