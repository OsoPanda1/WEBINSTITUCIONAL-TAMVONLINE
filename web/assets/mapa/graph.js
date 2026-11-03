/* TAMV Online Network — HCU Living Universe
 * Fuente única de datos del mapa vivo (ES + EN en el mismo archivo).
 *
 * Reglas de este archivo (las audita tools/map-data-audit.mjs):
 *  1. Cada entidad existe porque hay un registro consultable, o se marca como
 *     vacío declarado. Ningún nodo se inventa para "completar" el universo.
 *  2. Ningún número de influencia, riesgo o confianza se escribe a mano como
 *     medición. Los ejes derivados se calculan desde `seals` y `src`.
 *  3. Toda fuente lleva la fecha de la verificación que se hizo sobre ella.
 *  4. `st` es el estado de evidencia del método HCU-DEMO-1.0 (1 hipótesis,
 *     2 fuente localizada, 3 evidencia evaluada, 4 revisado en independiente,
 *     5 en disputa). Ninguna entidad de TAMV está hoy en 3 o 4.
 *
 * Especificación publicada del prototipo:
 * https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/hcu-methodology.md
 */
window.TAMV_GRAPH = {
  meta: {
    version: 'HCU-LIVE-1.0',
    spec: {
      href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/hcu-methodology.md',
      es: 'Especificación HCU-DEMO-1.0 (2026-10-27)',
      en: 'HCU-DEMO-1.0 specification (2026-10-27)'
    },
    audited: '2026-11-02',
    es: {
      title: 'HCU Living Universe — mapa vivo del ecosistema cognitivo TAMV',
      summary: 'Veinticinco nodos: un ancla conceptual, seis regiones de densidad y dieciocho entidades reales del ecosistema TAMV. Cada partícula enlaza el registro que la sustenta o admite que todavía no lo tiene.'
    },
    en: {
      title: 'HCU Living Universe — the living map of the TAMV cognitive ecosystem',
      summary: 'Twenty-five nodes: one conceptual anchor, six density regions and eighteen real entities of the TAMV ecosystem. Each particle links the record that supports it or admits that it has none yet.'
    }
  },

  /* ── ancla conceptual ─────────────────────────────────────────────────── */
  core: {
    id: 'core',
    kind: 'core',
    es: {
      name: 'Ω Core — ancla de orquestación',
      what: 'Punto de referencia conceptual que organiza las seis regiones y sus entidades. No es un servicio, un clúster ni un modelo ejecutándose: es la convención que permite que el mapa se lea como un solo campo.',
      risk: 'Riesgo de lectura: presentar el ancla como un sistema operativo en ejecución. El mapa no ejecuta nada y no mantiene estado entre visitas.',
      next: 'Si alguna vez existiera un registro real de orquestación, entraría como entidad con su evidencia, no como el fondo de la pantalla.'
    },
    en: {
      name: 'Ω Core — orchestration anchor',
      what: 'A conceptual reference point that organises the six regions and their entities. It is not a service, a cluster or a running model: it is the convention that lets the map be read as one field.',
      risk: 'Reading risk: presenting the anchor as an operating system in execution. The map runs nothing and keeps no state between visits.',
      next: 'If a real orchestration record ever exists it would enter as an entity with its evidence, not as the background of the screen.'
    }
  },

  /* ── seis regiones de densidad (dominios) ─────────────────────────────── */
  /* Los nombres siguen los seis dominios publicados en HCU-DEMO-1.0. */
  domains: [
    {
      id: 'ai', code: 'IA', color: '#5ac8ff',
      es: {
        name: 'Inteligencia artificial',
        field: 'Región donde TAMV concentra más afirmaciones y menos evidencia independiente: un sistema diseñado, un canon interno, una metodología de mapa y catorce agentes especificados.'
      },
      en: {
        name: 'Artificial intelligence',
        field: 'The region where TAMV concentrates the most claims and the least independent evidence: a designed system, an internal canon, a map methodology and fourteen specified agents.'
      }
    },
    {
      id: 'econ', code: 'EQ', color: '#a9b6c9',
      es: {
        name: 'Economía y trabajo',
        field: 'Región casi vacía. Lo único verificable hoy es el régimen de licencias del acervo; la comunidad —que es lo que daría contenido económico y colectivo— no existe todavía.'
      },
      en: {
        name: 'Economy and work',
        field: 'A nearly empty region. The only verifiable item today is the licence regime of the code corpus; the community —which is what would give the region economic and collective content— does not exist yet.'
      }
    },
    {
      id: 'gov', code: 'GO', color: '#8f7dff',
      es: {
        name: 'Gobernanza y derechos',
        field: 'La región más densa del mapa y la que sostiene la ambición institucional: ficha organizacional, expediente ROR, especificación de identidad y la puerta legal de datos personales, todavía cerrada a propósito.'
      },
      en: {
        name: 'Governance and rights',
        field: 'The densest region and the one carrying the institutional ambition: organisational record, ROR dossier, identity specification and the legal gate on personal data, still deliberately closed.'
      }
    },
    {
      id: 'climate', code: 'CL', color: '#4fd3a5',
      es: {
        name: 'Clima y territorio',
        field: 'Territorio declarado (Mineral del Monte, Hidalgo) con un atlas depositado, pero sin ninguna publicación propia cuya fuente sea independiente del fundador.'
      },
      en: {
        name: 'Climate and territory',
        field: 'A declared territory (Mineral del Monte, Hidalgo) with one deposited atlas, but no publication of its own whose source is independent of the founder.'
      }
    },
    {
      id: 'health', code: 'SA', color: '#e28bc0',
      es: {
        name: 'Salud y bienestar',
        field: 'Región deliberadamente sin producción. Lo publicado es una restricción de alcance: VETRA no autoriza uso clínico. Mostrar el vacío es más honesto que prestarle partículas de otros dominios.'
      },
      en: {
        name: 'Health and wellbeing',
        field: 'A region deliberately without output. What is published is a scope restriction: VETRA does not authorise clinical use. Showing the void is more honest than lending it particles from other domains.'
      }
    },
    {
      id: 'security', code: 'SE', color: '#e0736b',
      es: {
        name: 'Seguridad y resiliencia',
        field: 'Dependencia de una sola identidad, una cuenta que firma toda la producción y una dirección web que aún certifica independencia. Aquí vive el riesgo estructural del ecosistema.'
      },
      en: {
        name: 'Security and resilience',
        field: 'Dependence on a single identity, one account signing all output and a web address that does not yet certify independence. The structural risk of the ecosystem lives here.'
      }
    }
  ],

  /* ── entidades: partículas trazables ──────────────────────────────────── */
  entities: [
    {
      id: 'isabella', dom: 'ai', kind: 'nodo', act: 'propuesto', st: 2, rk: 'alto',
      es: {
        name: 'Isabella Villaseñor AI (GENESIS Ω∞ / UFCOS)',
        cls: 'Sistema con autoridad acotada',
        what: 'Proyecto tecnológico central del ecosistema: un asistente con memoria y catorce agentes de apoyo descritos como módulos de análisis. Su repositorio es público y existe un depósito con DOI de una evaluación de consistencia conceptual.',
        risk: 'Alto: es la entidad con más lenguaje de capacidad y menos evidencia de ejecución. Un lector puede suponer que el sistema corre, decide o aprende; la documentación publicada dice que los agentes están especificados, no desplegados, y que ninguna salida sustituye la revisión humana.',
        next: 'Para subir al estado "evidencia evaluada" hace falta una prueba independiente del alcance desplegado, con entorno, datos y limitaciones publicados. Para "revisado de forma independiente", un tercero identificable que firme el informe.'
      },
      en: {
        name: 'Isabella Villaseñor AI (GENESIS Ω∞ / UFCOS)',
        cls: 'System with bounded authority',
        what: 'The ecosystem central technology project: an assistant with memory and fourteen support agents described as analysis modules. Its repository is public and there is a DOI-bearing deposit of a conceptual-consistency evaluation.',
        risk: 'High: it is the entity with the most language of capability and the least evidence of execution. A reader may assume the system runs, decides or learns; the published documentation says the agents are specified, not deployed, and that no output replaces human review.',
        next: 'Reaching "evidence assessed" requires an independent test of the deployed scope, with environment, data and limitations published. "Independently reviewed" requires an identifiable third party signing the report.'
      },
      src: [
        { es: 'Repositorio público del sistema', en: 'Public repository of the system', href: 'https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6', ver: '2026-11-02' },
        { es: 'Depósito Zenodo: Evaluación Pública de Consistencia Conceptual de Isabella (2026-06-09, CC BY 4.0)', en: 'Zenodo deposit: Evaluación Pública de Consistencia Conceptual de Isabella (2026-06-09, CC BY 4.0)', href: 'https://doi.org/10.5281/zenodo.20606361', ver: '2026-11-02' },
        { es: 'Gobernanza de la IA en el sitio: qué puede y qué no puede decidir', en: 'Site governance page: what the AI may and may not decide', href: 'gobernanza.html' }
      ],
      seals: { persist: 'si', licence: 'parcial', affil: 'parcial', review: 'no', trace: 'parcial' }
    },
    {
      id: 'canon', dom: 'ai', kind: 'documento', act: 'activo', st: 2, rk: 'medio',
      es: {
        name: 'Canon VETRA Ω∞ v1.0',
        cls: 'Documento interno de gobierno',
        what: 'Define los quince principios, las tres puertas de admisión, las catorce áreas de metaevaluación y las reglas que limitan al propio fundador. Versión documental 1.0 del 2026-10-27, publicada en el repositorio del ecosistema.',
        risk: 'Medio: el documento describe comités, quórums y registros que hoy no tienen actas ni personas designadas. El sitio lo presenta como "diseñado, no poblado" para que la lectura no confunda arquitectura con operación.',
        next: 'Un dictamen interno real con fecha, revisor y expediente convertiría la especificación en evidencia evaluada. La licencia CC BY 4.0 está prevista pero sujeta a confirmar titularidad.'
      },
      en: {
        name: 'VETRA Ω∞ Canon v1.0',
        cls: 'Internal governance document',
        what: 'Defines the fifteen principles, the three admission gates, the fourteen meta-evaluation areas and the rules that bound the founder himself. Document version 1.0 dated 2026-10-27, published in the ecosystem repository.',
        risk: 'Medium: the document describes committees, quorums and registers that today have no minutes and no appointed people. The site presents it as "designed, not populated" so that architecture is not mistaken for operation.',
        next: 'A real internal ruling with date, reviewer and file would turn the specification into assessed evidence. The CC BY 4.0 licence is planned but pending confirmation of ownership.'
      },
      src: [
        { es: 'Documento canónico en el repositorio del ecosistema', en: 'Canonical document in the ecosystem repository', href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/CANON-VETRA-OMEGA-INFINITY-2026-V1.0.md', ver: '2026-11-02' },
        { es: 'Cómo lo lee el sitio: principios y puertas', en: 'How the site reads it: principles and gates', href: 'gobernanza.html' }
      ],
      seals: { persist: 'no', licence: 'parcial', affil: 'si', review: 'no', trace: 'si' }
    },
    {
      id: 'hcu', dom: 'ai', kind: 'capacidad', act: 'parcial', st: 2, rk: 'alto',
      es: {
        name: 'HCU Living Universe (este mapa)',
        cls: 'Interfaz de exploración y auditoría',
        what: 'Prototipo conceptual interactivo: toma la estructura publicada de HCU-DEMO-1.0 —un ancla, seis dominios, dieciocho entidades, siete flujos— y le añade lo que el documento no tenía: una fuente primaria enlazada por entidad y un digestivo de integridad calculado en el navegador.',
        risk: 'Alto: una visualización densa comunica autoridad que los datos no tienen. Por eso el mapa obliga a leer el estado de evidencia de cada partícula y muestra los vacíos con el mismo peso visual que los llenos.',
        next: 'Los cinco ejes siguen sin calibrar. Convertirlos en mediciones exige un método de ponderación publicado, contrastado con evaluadores humanos y con tasas de error medidas.'
      },
      en: {
        name: 'HCU Living Universe (this map)',
        cls: 'Exploration and audit interface',
        what: 'Interactive conceptual prototype: it takes the published HCU-DEMO-1.0 structure —one anchor, six domains, eighteen entities, seven flows— and adds what the document lacked: a primary source linked per entity and an integrity digest computed in the browser.',
        risk: 'High: a dense visualisation communicates authority the data do not have. That is why the map forces the reader to check each particle evidence state and shows voids with the same visual weight as filled nodes.',
        next: 'The five axes remain uncalibrated. Turning them into measurements requires a published weighting method, benchmarked against human evaluators and measured error rates.'
      },
      src: [
        { es: 'Especificación del método, la evidencia y los límites', en: 'Specification of method, evidence and limits', href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/hcu-methodology.md', ver: '2026-11-02' },
        { es: 'Dónde sitúa el sitio este prototipo', en: 'Where the site places this prototype', href: 'investigacion.html' }
      ],
      seals: { persist: 'no', licence: 'si', affil: 'si', review: 'no', trace: 'parcial' }
    },
    {
      id: 'vetra-agents', dom: 'ai', kind: 'capacidad', act: 'no-poblado', st: 1, rk: 'alto',
      es: {
        name: 'Catorce agentes de apoyo VETRA',
        cls: 'Especificados, no desplegados',
        what: 'Módulos de análisis descritos en el canon: organizan fuentes, comparan documentos, proponen preguntas y detectan incoherencias. No tienen voto, no pueden asignarse autoridad ni generar certificaciones por sí solos.',
        risk: 'Alto: es la entidad del mapa con cero evidencia de ejecución. Contar "catorce agentes" sin esta etiqueta sugiere un despliegue que no existe.',
        next: 'Publicar la lista real de módulos implementados, con su versión, su prueba y su tasa de error, los movería del estado 1 al 2.'
      },
      en: {
        name: 'Fourteen VETRA support agents',
        cls: 'Specified, not deployed',
        what: 'Analysis modules described in the canon: they organise sources, compare documents, propose questions and detect incoherence. They have no vote, cannot assign themselves authority and cannot generate certifications alone.',
        risk: 'High: this is the map entity with zero evidence of execution. Counting "fourteen agents" without this label suggests a deployment that does not exist.',
        next: 'Publishing the real list of implemented modules, with version, test and error rate, would move them from state 1 to 2.'
      },
      src: [
        { es: 'Declaración del canon sobre la naturaleza de los agentes', en: 'Canon statement on the nature of the agents', href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/CANON-VETRA-OMEGA-INFINITY-2026-V1.0.md', ver: '2026-11-02' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'no', trace: 'no' }
    },

    {
      id: 'members', dom: 'econ', kind: 'actor', act: 'cerrado-por-diseno', st: 1, rk: 'alto',
      es: {
        name: 'Membresía de la red: cero perfiles aprobados',
        cls: 'Cerrado por diseño',
        what: 'La plataforma existe como especificación y como código, con estados de aprobación, visibilidad y consentimiento registrados. Hoy no hay ningún perfil aprobado: el alta permanece deshabilitada mientras falten el responsable de datos real, su domicilio y la política de retención aprobada.',
        risk: 'Alto y estructural: ROR pide evidencia de entidad colectiva. Mientras toda la producción tenga una sola firma, la red es una arquitectura sin comunidad, y esa es la brecha que bloquea la solicitud.',
        next: 'La secuencia verificable es: recibir propuestas, aprobar perfiles con consentimiento explícito, publicar afiliaciones en producción de terceros y sumar al menos diez personas autoras.'
      },
      en: {
        name: 'Network membership: zero approved profiles',
        cls: 'Closed by design',
        what: 'The platform exists as specification and as code, with approval, visibility and consent states recorded. Today no profile is approved: sign-up stays disabled while the real data controller, its address and the approved retention policy are missing.',
        risk: 'High and structural: ROR asks for evidence of a collective entity. While all output carries one signature, the network is an architecture without a community, and that is the gap blocking the application.',
        next: 'The verifiable sequence is: receive proposals, approve profiles with explicit consent, publish affiliations in third-party output and reach at least ten authoring people.'
      },
      src: [
        { es: 'Condiciones de membresía y puerta legal cerrada', en: 'Membership terms and closed legal gate', href: 'membresia.html' },
        { es: 'Reglas de datos del registro de miembros', en: 'Data rules of the member register', href: 'gobernanza.html' }
      ],
      seals: { persist: 'na', licence: 'na', affil: 'no', review: 'no', trace: 'parcial' }
    },
    {
      id: 'call', dom: 'econ', kind: 'nodo', act: 'activo', st: 2, rk: 'medio',
      es: {
        name: 'Convocatoria abierta a investigadores independientes',
        cls: 'Mecanismo publicado, sin respuestas registradas',
        what: 'Canal público por el que una persona puede enviar una propuesta con sus fuentes y su declaración de conflictos. Es la vía diseñada para que la red deje de ser unipersonal.',
        risk: 'Medio: publicar una convocatoria no produce colaboradores. Si el mapa mostrara "n nodos federados" sin evidencia, estaría fabricando la comunidad.',
        next: 'Cada propuesta recibida debería entrar al mapa como entidad nueva, con su firma y su expediente, no como un número anunciado.'
      },
      en: {
        name: 'Open call for independent researchers',
        cls: 'Published mechanism, no recorded responses',
        what: 'Public channel through which a person can submit a proposal with its sources and conflict declaration. It is the designed way for the network to stop being one person.',
        risk: 'Medium: publishing a call does not produce collaborators. If the map showed "n federated nodes" without evidence, it would be fabricating the community.',
        next: 'Each proposal received should enter the map as a new entity, with its signature and its file, not as an announced number.'
      },
      src: [
        { es: 'Texto y requisitos de la convocatoria', en: 'Call text and requirements', href: 'convocatoria.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'no', trace: 'no' }
    },
    {
      id: 'licensing', dom: 'econ', kind: 'registro', act: 'parcial', st: 2, rk: 'bajo',
      es: {
        name: 'Régimen de licencias del acervo',
        cls: 'Tres alcances separados',
        what: 'El sitio separa código (MIT), tipografías (SIL Open Font License 1.1) y marca (reservada, con aviso NOTICE). Los depósitos con DOI inspected están bajo CC BY 4.0. No existe una licencia global del repositorio base.',
        risk: 'Bajo: es de las pocas entidades completamente verificables hoy. El riesgo residual es citar una licencia "prevista" como vigente.',
        next: 'Extender el mismo régimen a los repositorios que hoy no declaran licencia, empezando por los que se enlazan desde el sitio.'
      },
      en: {
        name: 'Licence regime of the corpus',
        cls: 'Three separate scopes',
        what: 'The site separates code (MIT), typefaces (SIL Open Font License 1.1) and brand (reserved, with a NOTICE file). Inspected DOI-bearing deposits are under CC BY 4.0. There is no global licence for the base repository.',
        risk: 'Low: one of the few fully verifiable entities today. The residual risk is citing a planned licence as if it were in force.',
        next: 'Extend the same regime to repositories that declare no licence today, starting with those linked from the site.'
      },
      src: [
        { es: 'Licencia MIT del código del sitio', en: 'MIT licence of the site code', href: 'https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE/blob/main/LICENSE', ver: '2026-11-02' },
        { es: 'Aviso de marca reservada y tipografías', en: 'Reserved-brand and typeface notice', href: 'https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE/blob/main/NOTICE', ver: '2026-11-02' },
        { es: 'Cómo lo declara el sitio', en: 'How the site declares it', href: 'produccion.html' }
      ],
      seals: { persist: 'no', licence: 'si', affil: 'si', review: 'na', trace: 'si' }
    },

    {
      id: 'org-record', dom: 'gov', kind: 'registro', act: 'parcial', st: 2, rk: 'alto',
      es: {
        name: 'Ficha institucional: denominación, sede e identificadores',
        cls: 'Registro con variantes inconsistentes',
        what: 'La cadena canónica declarada es «TAMV Online Network». Los depósitos conservan variantes ("TAMV ONLINE", "TAMV ONLINE NETWORK" en todo mayúsculas) y el perfil de la cuenta GitHub se muestra como "TAMV ONLINE ENTERPRISE", una denominación que el propio sitio declara que no es esta red.',
        risk: 'Alto para curaduría: un curador de ROR, OpenAlex o Crossref compara cadenas de texto. La inconsistencia no es cosmética: es la evidencia más débil del expediente.',
        next: 'Corregir cada proveedor por su procedimiento, dejar constancia de la fecha y evitar que el perfil público de la cuenta contradiga la afiliación declarada.'
      },
      en: {
        name: 'Institutional record: name, seat and identifiers',
        cls: 'Record with inconsistent variants',
        what: 'The declared canonical string is "TAMV Online Network". Deposits keep variants ("TAMV ONLINE", "TAMV ONLINE NETWORK" in full caps) and the GitHub account profile displays as "TAMV ONLINE ENTERPRISE", a name the site itself declares is not this network.',
        risk: 'High for curation: an ROR, OpenAlex or Crossref curator compares text strings. Inconsistency is not cosmetic: it is the weakest evidence in the dossier.',
        next: 'Correct each provider through its own procedure, record the date, and stop the account public profile from contradicting the declared affiliation.'
      },
      src: [
        { es: 'Ficha institucional campo por campo', en: 'Institutional record field by field', href: 'organizacion.html' },
        { es: 'Registro de autoridad en JSON-LD', en: 'Authority record in JSON-LD', href: 'organization.json' },
        { es: 'GeoNames de la sede: Mineral del Monte, Hidalgo', en: 'GeoNames entry for the seat: Mineral del Monte, Hidalgo', href: 'https://www.geonames.org/3523180/mineral-del-monte.html', ver: '2026-11-02' },
        { es: 'ORCID del fundador', en: 'Founder ORCID', href: 'https://orcid.org/0009-0008-5050-1539', ver: '2026-11-02' }
      ],
      seals: { persist: 'parcial', licence: 'na', affil: 'parcial', review: 'na', trace: 'si' }
    },
    {
      id: 'ror-app', dom: 'gov', kind: 'nodo', act: 'parcial', st: 2, rk: 'alto',
      es: {
        name: 'Expediente de solicitud ROR',
        cls: 'Preparado, no presentado',
        what: 'Autoevaluación contra los criterios publicados del registro, la plantilla oficial de alta y el canal de consulta previa. Declara sin rodeos qué campos no puede llenar hoy y en qué orden se cierran.',
        risk: 'Alto por expectativa: una fecha objetivo (marzo de 2027) puede leerse como un resultado garantizado. La decisión es del equipo de curaduría de ROR, no de TAMV.',
        next: 'El campo `domains` de la plantilla exige un dominio propio; un subdominio de plataforma no certifica independencia. Después: producción con afiliación coherente y al menos diez autoras/es externos.'
      },
      en: {
        name: 'ROR application dossier',
        cls: 'Prepared, not filed',
        what: 'Self-assessment against the registry published criteria, the official add-organisation template and the pre-submission enquiry channel. It states plainly which fields cannot be filled today and in which order they close.',
        risk: 'High by expectation: a target date (March 2027) can be read as a guaranteed outcome. The decision belongs to the ROR curation team, not to TAMV.',
        next: 'The template `domains` field requires an owned domain; a platform subdomain does not certify independence. Then: output with coherent affiliation and at least ten external authors.'
      },
      src: [
        { es: 'Criterios de inclusión y proceso del registro', en: 'Registry inclusion criteria and process', href: 'https://ror.org/registry/', ver: '2026-11-02' },
        { es: 'Plantilla oficial de alta de organización', en: 'Official organisation intake template', href: 'https://github.com/ror-community/ror-updates/blob/master/.github/ISSUE_TEMPLATE/add-organization-to-ror.md', ver: '2026-11-02' },
        { es: 'El expediente publicado por TAMV', en: 'The dossier published by TAMV', href: 'ror.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'parcial', review: 'no', trace: 'si' }
    },
    {
      id: 'tri', dom: 'gov', kind: 'capacidad', act: 'no-poblado', st: 1, rk: 'medio',
      es: {
        name: 'Identidad TRI / TAMV ID',
        cls: 'Especificación publicada, migración no aplicada',
        what: 'Registro de identificadores de miembro con reglas de seudonimización y retiro. El runbook describe la migración SQL y los controles de acceso; la migración no se ha aplicado a la base conectada y el alta sigue deshabilitada.',
        risk: 'Medio: un lector puede asumir que un TRI es un identificador reconocido fuera de TAMV. No lo es: no equivale a ORCID ni a ISNI y no es una acreditación.',
        next: 'Aplicar la migración en un entorno con responsable de datos designado y publicar el estado real del registro, incluidos los retiros.'
      },
      en: {
        name: 'TRI identity / TAMV ID',
        cls: 'Published specification, migration not applied',
        what: 'Member identifier register with pseudonymisation and withdrawal rules. The runbook describes the SQL migration and the access controls; the migration has not been applied to the connected database and sign-up remains disabled.',
        risk: 'Medium: a reader may assume a TRI is an identifier recognised outside TAMV. It is not: it neither equals ORCID nor ISNI, and it is not an accreditation.',
        next: 'Apply the migration in an environment with a designated data controller and publish the real state of the register, withdrawals included.'
      },
      src: [
        { es: 'Guía de implementación (runbook)', en: 'Implementation runbook', href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/tamv-id-runbook.md', ver: '2026-11-02' },
        { es: 'Qué es y qué no es un TRI', en: 'What a TRI is and is not', href: 'identificador.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'no', trace: 'parcial' }
    },
    {
      id: 'privacy', dom: 'gov', kind: 'registro', act: 'cerrado-por-diseno', st: 2, rk: 'alto',
      es: {
        name: 'Puerta legal de datos personales y retención',
        cls: 'Cerrada a propósito',
        what: 'La API de registro responde 503 mientras falten el nombre real del responsable, su domicilio y un canal de privacidad monitorizado, y mientras la política de retención no esté aprobada. El marco operativo es la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
        risk: 'Alto si se abre antes de tiempo: recolectar datos personales sin responsable designado sería un incumplimiento, no un avance.',
        next: 'Designar el responsable, publicar el aviso de privacidad versionado y los derechos ARCO, aprobar la retención y sólo entonces habilitar el alta.'
      },
      en: {
        name: 'Legal gate on personal data and retention',
        cls: 'Deliberately closed',
        what: 'The register API answers 503 while the real controller name, its address and a monitored privacy channel are missing, and while the retention policy is unapproved. The operating frame is the Mexican Federal Law on Protection of Personal Data Held by Private Parties.',
        risk: 'High if opened early: collecting personal data without a designated controller would be a breach, not progress.',
        next: 'Designate the controller, publish the versioned privacy notice and ARCO rights, approve retention and only then enable sign-up.'
      },
      src: [
        { es: 'Ley Federal de Protección de Datos Personales (PDF oficial)', en: 'Mexican Federal Personal Data Protection Law (official PDF)', href: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', ver: '2026-11-02' },
        { es: 'Reglas operativas del registro de miembros', en: 'Operating rules of the member register', href: 'gobernanza.html' }
      ],
      seals: { persist: 'na', licence: 'na', affil: 'si', review: 'na', trace: 'si' }
    },

    {
      id: 'memoria', dom: 'climate', kind: 'documento', act: 'no-poblado', st: 1, rk: 'medio',
      es: {
        name: 'Línea de memoria territorial: Real del Monte',
        cls: 'Línea declarada, sin fuente independiente',
        what: 'Programa para documentar patrimonio, relatos locales, capacidades comunitarias y conocimiento situado de Mineral del Monte y su región, con atribución y consentimiento. La sede coincide con el registro de GeoNames y con ORCID.',
        risk: 'Medio: es la línea con más identidad y menos evidencia. La auditoría de fuentes no localizó ninguna publicación de esta línea con fuente pública independiente.',
        next: 'Fuentes primarias de archivo o testimonio con consentimiento registrado, y una publicación depositada que no dependa de la cuenta del fundador.'
      },
      en: {
        name: 'Territorial memory line: Real del Monte',
        cls: 'Declared line, no independent source',
        what: 'Programme to document heritage, local accounts, community capabilities and situated knowledge of Mineral del Monte and its region, with attribution and consent. The seat matches the GeoNames record and ORCID.',
        risk: 'Medium: the line with most identity and least evidence. The source audit did not locate any publication of this line with an independent public source.',
        next: 'Primary archive or testimony sources with recorded consent, and a deposited publication that does not depend on the founder account.'
      },
      src: [
        { es: 'GeoNames: Mineral del Monte, Hidalgo, México', en: 'GeoNames: Mineral del Monte, Hidalgo, Mexico', href: 'https://www.geonames.org/3523180/mineral-del-monte.html', ver: '2026-11-02' },
        { es: 'Cómo declara el sitio la madurez de esta línea', en: 'How the site declares this line maturity', href: 'investigacion.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'no', trace: 'no' }
    },
    {
      id: 'atlas', dom: 'climate', kind: 'registro', act: 'parcial', st: 2, rk: 'medio',
      es: {
        name: 'Atlas territorial depositado (Figshare 32508306)',
        cls: 'Registro con metadatos inconsistentes',
        what: 'Artículo depositado el 2026-05-29 bajo CC BY 4.0, titulado "TAMV ATLAS V4.0 ENTERPRISE: Infraestructura analizada por AI". El registro existe y es recuperable; su título usa la denominación que el sitio declara inválida y no incluye campo de afiliación.',
        risk: 'Medio: es evidencia de que la red publica, y a la vez evidencia de la brecha de normalización. Un curador leerá ambas cosas.',
        next: 'Corregir título y afiliación por el procedimiento del proveedor y dejar constancia de la corrección en la página de producción.'
      },
      en: {
        name: 'Deposited territorial atlas (Figshare 32508306)',
        cls: 'Record with inconsistent metadata',
        what: 'Article deposited 2026-05-29 under CC BY 4.0, titled "TAMV ATLAS V4.0 ENTERPRISE: Infraestructura analizada por AI". The record exists and is retrievable; its title uses the name the site declares invalid and it carries no affiliation field.',
        risk: 'Medium: it is evidence that the network publishes, and at the same time evidence of the normalisation gap. A curator will read both.',
        next: 'Correct title and affiliation through the provider procedure and record the correction on the outputs page.'
      },
      src: [
        { es: 'Ficha del registro en la API de Figshare', en: 'Record in the Figshare API', href: 'https://api.figshare.com/v2/articles/32508306', ver: '2026-11-02' },
        { es: 'Página de aterrizaje del artículo', en: 'Article landing page', href: 'https://figshare.com/articles/online_first/32508306', ver: '2026-11-02' },
        { es: 'Catálogo de producción del sitio', en: 'Site production catalogue', href: 'produccion.html' }
      ],
      seals: { persist: 'si', licence: 'si', affil: 'no', review: 'no', trace: 'si' }
    },
    {
      id: 'open-data', dom: 'climate', kind: 'capacidad', act: 'propuesto', st: 1, rk: 'bajo',
      es: {
        name: 'Datos abiertos territoriales como insumo',
        cls: 'Fuente de autoridad disponible, sin trabajo propio',
        what: 'La infraestructura pública que una línea territorial comprobable necesitaría: la Plataforma Nacional de Datos Abiertos y la cartografía estadística nacional. Están en el mapa como destino verificable, no como producción de TAMV.',
        risk: 'Bajo: no hay afirmación que sostener todavía. El riesgo sería citar estos portales como si TAMV ya los hubiera trabajado.',
        next: 'Un conjunto propio que combine datos abiertos con testimonio local, depositado con licencia y metadatos correctos.'
      },
      en: {
        name: 'Open territorial data as input',
        cls: 'Authority source available, no own work',
        what: 'The public infrastructure a verifiable territorial line would need: the Mexican National Open Data Platform and the national statistical cartography. They are on the map as a verifiable destination, not as TAMV output.',
        risk: 'Low: there is no claim to support yet. The risk would be citing these portals as if TAMV had already worked with them.',
        next: 'An own dataset combining open data with local testimony, deposited with the right licence and metadata.'
      },
      src: [
        { es: 'Plataforma Nacional de Datos Abiertos', en: 'Mexican National Open Data Platform', href: 'https://www.datos.gob.mx/', ver: '2026-11-02' },
        { es: 'Principios FAIR como criterio de depósito', en: 'FAIR principles as deposit criterion', href: 'https://www.go-fair.org/fair-principles/', ver: '2026-11-02' }
      ],
      seals: { persist: 'na', licence: 'na', affil: 'na', review: 'na', trace: 'no' }
    },

    {
      id: 'scope-rule', dom: 'health', kind: 'registro', act: 'activo', st: 2, rk: 'alto',
      es: {
        name: 'Restricción de alcance: sin uso clínico, financiero ni de infraestructura crítica',
        cls: 'Contención publicada',
        what: 'El marco declara que una evaluación VETRA no autoriza por sí sola un uso clínico, financiero, laboral, legal ni de infraestructura crítica, y que una puntuación no se traduce en precio de mercado, probabilidad de patente ni decisión de inversión.',
        risk: 'Alto si se omite: es la regla que impide que el mapa se lea como un sistema de validación de salud. Su presencia aquí es la prueba de que la contención está publicada.',
        next: 'Que un tercero cite la restricción al rechazar o condicionar un uso —eso sería evidencia de que opera— en lugar de repetirla TAMV.'
      },
      en: {
        name: 'Scope restriction: no clinical, financial or critical-infrastructure use',
        cls: 'Published containment',
        what: 'The framework declares that a VETRA evaluation does not by itself authorise clinical, financial, labour, legal or critical-infrastructure use, and that a score does not translate into market price, patentability or an investment decision.',
        risk: 'High if omitted: it is the rule that stops the map from being read as a health validation system. Its presence here is proof that the containment is published.',
        next: 'A third party citing the restriction when rejecting or conditioning a use —that would be evidence it operates— rather than TAMV repeating it.'
      },
      src: [
        { es: 'Dónde enuncia el sitio la restricción', en: 'Where the site states the restriction', href: 'gobernanza.html' },
        { es: 'Ética y gobernanza de la IA para la salud (OMS, 2024)', en: 'Ethics and governance of AI for health (WHO, 2024)', href: 'https://www.who.int/publications/i/item/9789240029200', ver: '2026-11-02' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'na', trace: 'si' }
    },
    {
      id: 'health-void', dom: 'health', kind: 'vacio', act: 'vacio', st: 1, rk: 'bajo',
      es: {
        name: 'Vacío declarado: ninguna producción en salud',
        cls: 'Ausencia hecha visible',
        what: 'Partícula sin registro: en los depósitos consultados no hay ningún trabajo de TAMV sobre salud. El mapa la dibuja con el mismo tamaño que una entidad llena para que la ausencia se vea, no se infiera.',
        risk: 'Bajo. El riesgo real sería rellenarla con una partícula prestada de otro dominio.',
        next: 'Si la línea de bienestar comunitario llegara a tener fuente primaria y depósito, sustituiría este marcador con su evidencia.'
      },
      en: {
        name: 'Declared void: no health output',
        cls: 'Absence made visible',
        what: 'Particle with no record: among the consulted deposits there is no TAMV work on health. The map draws it at the same size as a filled entity so that the absence is seen, not inferred.',
        risk: 'Low. The real risk would be filling it with a particle borrowed from another domain.',
        next: 'If the community-wellbeing line ever had a primary source and a deposit, it would replace this marker with its evidence.'
      },
      src: [
        { es: 'Catálogo de producción consultado', en: 'Consulted production catalogue', href: 'produccion.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'na', review: 'na', trace: 'na' }
    },

    {
      id: 'code-hygiene', dom: 'security', kind: 'registro', act: 'parcial', st: 2, rk: 'alto',
      es: {
        name: 'Higiene del acervo de código',
        cls: 'Inventario auditado, remediación pendiente',
        what: 'La cuenta pública registraba 143 repositorios públicos el 2026-11-02 (103 propios y 40 forks, incluido el repositorio del propio sitio). La auditoría encontró licencia en el 18 % de los casos, temas en el 7 %, cero contribuciones humanas externas en 677 commits analizados, un 31 % de commits firmados por bots de construcción, `CITATION.cff` en solo 2 repositorios y ninguna release: por eso no existe ningún DOI emitido desde GitHub.',
        risk: 'Alto para citabilidad: sin versiones ni CITATION no hay citación estable del código, y sin revisores externos no hay evidencia de comunidad técnica.',
        next: 'Fijar una lista "core", versionar con etiqueta anotada y conectar Zenodo para que cada release emita DOI; archivar o pasar a privado los experimentos, declarando cuáles.'
      },
      en: {
        name: 'Code corpus hygiene',
        cls: 'Audited inventory, remediation pending',
        what: 'The public account registered 143 public repositories on 2026-11-02 (103 own and 40 forks, including the site repository itself). The audit found a licence in 18 % of cases, topics in 7 %, zero external human contributions across 677 analysed commits, 31 % of commits signed by build bots, `CITATION.cff` in only 2 repositories and no release: which is why no DOI has been issued from GitHub.',
        risk: 'High for citability: without versions or CITATION there is no stable citation of the code, and without external reviewers no evidence of a technical community.',
        next: 'Fix a "core" list, tag annotated releases and connect Zenodo so each release emits a DOI; archive or privatise the experiments, declaring which.'
      },
      src: [
        { es: 'Consulta a la API de GitHub (143 repositorios públicos hoy)', en: 'GitHub API query (143 public repositories today)', href: 'https://api.github.com/users/OsoPanda1', ver: '2026-11-02' },
        { es: 'Cómo lo reporta el sitio', en: 'How the site reports it', href: 'investigacion.html' }
      ],
      seals: { persist: 'no', licence: 'parcial', affil: 'parcial', review: 'no', trace: 'si' }
    },
    {
      id: 'domain-gap', dom: 'security', kind: 'nodo', act: 'parcial', st: 2, rk: 'alto',
      es: {
        name: 'Dirección web propia y correo institucional',
        cls: 'Diferido con consecuencias conocidas',
        what: 'El sitio vive hoy en un host de plataforma cuyo subdominio lleva sufijo de cuenta. El dominio que se usa para correo resuelve y recibe mensajes, pero su redirección web apunta a un despliegue eliminado que devuelve 404. La plantilla de alta de ROR pide dominios de la organización.',
        risk: 'Alto: mientras el sitio viva en un subdominio de plataforma, el campo `domains` de la solicitud no se puede llenar con evidencia de independencia. Un dominio propio debe existir antes de presentar, no después.',
        next: 'Eliminar la redirección huérfana, publicar el sitio en el dominio propio y regenerar canonicals, hreflang, robots.txt y sitemap antes de presentar la solicitud.'
      },
      en: {
        name: 'Own web address and institutional email',
        cls: 'Deferred with known consequences',
        what: 'The site today lives on a platform host whose subdomain carries an account suffix. The domain used for mail resolves and receives messages, but its web redirect points to a deleted deployment returning 404. The ROR intake template asks for organisation domains.',
        risk: 'High: while the site lives on a platform subdomain, the application `domains` field cannot be filled with evidence of independence. An owned domain must exist before filing, not after.',
        next: 'Delete the orphan redirect, publish the site on the owned domain and regenerate canonicals, hreflang, robots.txt and the sitemap before filing.'
      },
      src: [
        { es: 'Dónde el expediente declara el diferimiento del dominio', en: 'Where the dossier declares the domain deferral', href: 'ror.html' },
        { es: 'Sede y datos de contacto publicados', en: 'Published seat and contact data', href: 'organizacion.html' }
      ],
      seals: { persist: 'no', licence: 'na', affil: 'si', review: 'na', trace: 'parcial' }
    }
  ],

  /* ── siete flujos: proposiciones curadas ──────────────────────────────── */
  /* Hipótesis de relación, no relaciones causales validadas. */
  flows: [
    {
      id: 'f1', from: ['org-record', 'licensing', 'atlas'], to: ['ror-app'], type: 'condición documental',
      es: {
        claim: 'La coherencia de la cadena de afiliación es condición para que un curador reconozca la entidad: los registros que hoy muestran variantes ("TAMV ONLINE", "ENTERPRISE") debilitan el expediente en vez de reforzarlo.',
        test: 'Qué tendría que observarse para subir de estado: correcciones confirmadas por cada proveedor, con fecha, y una búsqueda en DataCite/OpenAlex donde la cadena exacta aparezca sin variante concurrente.'
      },
      en: {
        claim: 'Coherence of the affiliation chain is the condition for a curator to recognise the entity: records today showing variants ("TAMV ONLINE", "ENTERPRISE") weaken the dossier instead of strengthening it.',
        test: 'What would have to be observed to raise the state: corrections confirmed by each provider, with date, and a DataCite/OpenAlex search where the exact string appears without a competing variant.'
      }
    },
    {
      id: 'f2', from: ['call', 'members'], to: ['ror-app'], type: 'brecha estructural',
      es: {
        claim: 'Una red federada se demuestra con personas externas que afilián su producción, no con arquitectura. Hoy la evidencia pública muestra una sola identidad firmando todo el registro.',
        test: 'Diez personas autoras externas con afiliación publicada en producción citable, más un registro de miembros con perfiles aprobados y consentimiento explícito.'
      },
      en: {
        claim: 'A federated network is proven by outside people affiliating their output, not by architecture. Today public evidence shows a single identity signing the whole record.',
        test: 'Ten external authoring people with published affiliation in citable output, plus a member register with approved profiles and explicit consent.'
      }
    },
    {
      id: 'f3', from: ['canon', 'vetra-agents', 'isabella'], to: ['hcu'], type: 'especificación versus ejecución',
      es: {
        claim: 'Documentar un mecanismo no lo implementa. Los agentes y las puertas de VETRA existen como texto; el mapa sólo puede reflejar ese estado, y hacerlo visible es su función principal.',
        test: 'Prueba independiente del alcance desplegado, informe firmado por una revisora identificable y declaración de conflictos; sin eso, el estado 1 es el correcto.'
      },
      en: {
        claim: 'Documenting a mechanism does not implement it. The agents and VETRA gates exist as text; the map can only reflect that state, and making it visible is its main function.',
        test: 'Independent test of the deployed scope, a report signed by an identifiable reviewer and a conflict declaration; without that, state 1 is the correct one.'
      }
    },
    {
      id: 'f4', from: ['memoria'], to: ['open-data', 'atlas'], type: 'comprobabilidad',
      es: {
        claim: 'La memoria territorial sólo se vuelve investigación cuando enlaza fuente primaria y datos abiertos verificables; sin eso queda como declaración de identidad.',
        test: 'Un depósito propio con fuentes de archivo o testimonio consentido, licencia correcta y metadatos que no dependan de la cuenta del fundador.'
      },
      en: {
        claim: 'Territorial memory only becomes research when it links primary sources and verifiable open data; without that it stays an identity statement.',
        test: 'An own deposit with archive or consented testimony sources, correct licence and metadata that do not depend on the founder account.'
      }
    },
    {
      id: 'f5', from: ['privacy'], to: ['members', 'tri'], type: 'contención por diseño',
      es: {
        claim: 'El alta y la recepción de propuestas están cerradas porque falta la base legal, no porque falte código. Es la diferencia entre un producto incompleto y uno responsable.',
        test: 'Responsable de datos designado, aviso de privacidad versionado publicado, política de retención aprobada y luego el alta habilitada con consentimiento registrado.'
      },
      en: {
        claim: 'Sign-up and proposal intake are closed because the legal basis is missing, not because code is missing. That is the difference between an unfinished product and a responsible one.',
        test: 'Designated data controller, published versioned privacy notice, approved retention policy and only then sign-up enabled with recorded consent.'
      }
    },
    {
      id: 'f6', from: ['domain-gap', 'hcu'], to: ['ror-app'], type: 'independencia declarable',
      es: {
        claim: 'La independencia institucional también se lee en la infraestructura: un subdominio de plataforma no certifica que la organización controle su propio sitio.',
        test: 'Dominio propio publicado, canonicals y sitemap regenerados sobre ese dominio y correo institucional consistente con la denominación.'
      },
      en: {
        claim: 'Institutional independence is also read in the infrastructure: a platform subdomain does not certify that the organisation controls its own site.',
        test: 'Owned domain published, canonicals and sitemap regenerated on that domain, and institutional mail consistent with the declared name.'
      }
    },
    {
      id: 'f7', from: ['code-hygiene', 'licensing'], to: ['isabella'], type: 'citabilidad del código',
      es: {
        claim: 'El software del ecosistema no es citable de forma estable mientras no tenga versión, licencia declarada en cada repositorio core y DOI emitido desde la release.',
        test: 'Etiqueta de versión anotada, CITATION.cff válido y un DOI generado por Zenodo a partir de esa release, verificable en DataCite.'
      },
      en: {
        claim: 'Ecosystem software is not stably citable while it lacks a version, a declared licence in each core repository and a DOI issued from the release.',
        test: 'Annotated version tag, valid CITATION.cff and a DOI generated by Zenodo from that release, verifiable in DataCite.'
      }
    }
  ],

  /* ── crónica: fechas de registro, no previsión ────────────────────────── */
  chronology: [
    { date: '2020', kind: 'declarado', es: 'Antigüedad declarada de la red en el registro de autoridad.', en: 'Network age declared in the authority record.', refs: ['org-record'], href: 'organization.json' },
    { date: '2022-12-10', kind: 'registrado', es: 'Apertura de la cuenta de GitHub que hoy firma toda la producción.', en: 'Opening of the GitHub account that today signs all output.', refs: ['code-hygiene'], href: 'https://api.github.com/users/OsoPanda1' },
    { date: '2026-04-06', kind: 'depositado', es: 'Primer depósito con DOI resolvable: Compendium of Technological Sovereignty (TAMV MD-X4).', en: 'First DOI-bearing deposit: Compendium of Technological Sovereignty (TAMV MD-X4).', refs: ['licensing'], href: 'https://doi.org/10.5281/zenodo.19436661' },
    { date: '2026-04-25', kind: 'depositado', es: 'Artículo en Figshare sin campo de afiliación.', en: 'Figshare article without an affiliation field.', refs: ['atlas', 'org-record'], href: 'https://api.figshare.com/v2/articles/32098846' },
    { date: '2026-05-20', kind: 'depositado', es: 'Memoria Fundacional TAMV ONLINE depositada en Figshare.', en: 'Memoria Fundacional TAMV ONLINE deposited on Figshare.', refs: ['org-record'], href: 'https://api.figshare.com/v2/articles/32337309' },
    { date: '2026-05-29', kind: 'depositado', es: 'ATLAS V4.0 con el título que el sitio declara inválido.', en: 'ATLAS V4.0 carrying the title the site declares invalid.', refs: ['atlas'], href: 'https://api.figshare.com/v2/articles/32508306' },
    { date: '2026-06-09', kind: 'depositado', es: 'Evaluación pública de consistencia conceptual de Isabella, con DOI y CC BY 4.0.', en: 'Public conceptual-consistency evaluation of Isabella, with DOI and CC BY 4.0.', refs: ['isabella'], href: 'https://doi.org/10.5281/zenodo.20606361' },
    { date: '2026-10-27', kind: 'publicado', es: 'Canon VETRA Ω∞ v1.0, especificación HCU-DEMO-1.0 y runbook del TAMV ID.', en: 'VETRA Ω∞ Canon v1.0, HCU-DEMO-1.0 specification and TAMV ID runbook.', refs: ['canon', 'hcu', 'tri'], href: 'https://github.com/OsoPanda1/tamvonline-weboficial.com/blob/main/docs/hcu-methodology.md' },
    { date: '2026-11-01', kind: 'publicado', es: 'Sitio institucional bilingüe publicado y auditado contra fuentes públicas.', en: 'Bilingual institutional site published and audited against public sources.', refs: ['org-record', 'ror-app', 'call'], href: 'index.html' },
    { date: '2026-11-02', kind: 'verificado', es: 'Cada fuente de este mapa se volvió a consultar y se registró su fecha.', en: 'Every source in this map was re-queried and its date recorded.', refs: ['hcu'], href: 'mapa.html' },
    { date: '2027-03', kind: 'previsto', es: 'Meta declarada: diez autoras/es externos por la convocatoria y una aceptación en tema de Frontiers. No es un resultado garantizado.', en: 'Declared target: ten external authors through the call and one Frontiers topic acceptance. Not a guaranteed outcome.', refs: ['call', 'members'], href: 'ror.html' }
  ],

  /* ── ejes y estados: definición honesta ───────────────────────────────── */
  axes: [
    {
      id: 'density', es: { name: 'Densidad de evidencia', basis: 'Calculada: número de sellos verificados y fuentes enlazadas en el propio nodo. No es una medición de importancia del tema.' },
      en: { name: 'Evidence density', basis: 'Computed: number of verified seals and linked sources on the node itself. It is not a measurement of the topic importance.' }
    },
    {
      id: 'reach', es: { name: 'Influencia sistémica', basis: 'Cualitativa y atribuida: banda alta/media/baja con la fuente que la sustenta. El mapa no la convierte en número.' },
      en: { name: 'Systemic influence', basis: 'Qualitative and attributed: high/medium/low band with the source behind it. The map does not turn it into a number.' }
    },
    {
      id: 'risk', es: { name: 'Riesgo potencial', basis: 'Riesgo de mala lectura del nodo (exageración, dependencia, ausencia), no riesgo del tema mundial. Se hereda del texto publicado de cada entidad.' },
      en: { name: 'Potential risk', basis: 'Risk of misreading the node (exaggeration, dependence, absence), not global topic risk. It comes from each entity published text.' }
    },
    {
      id: 'unc', es: { name: 'Incertidumbre', basis: 'Derivada: crece cuando baja la densidad de evidencia. Es una consecuencia visible del registro, no una opinión.' },
      en: { name: 'Uncertainty', basis: 'Derived: it grows as evidence density falls. It is a visible consequence of the record, not an opinion.' }
    },
    {
      id: 'trans', es: { name: 'Potencial de transformación', basis: 'La acción requerida para subir de estado, escrita en cada nodo. Es una tarea, no un puntaje.' },
      en: { name: 'Transformation potential', basis: 'The action required to raise the state, written on each node. It is a task, not a score.' }
    }
  ],

  states: [
    { code: 1, es: 'Hipótesis o relación propuesta', en: 'Hypothesis or proposed relation' },
    { code: 2, es: 'Fuente localizada', en: 'Source located' },
    { code: 3, es: 'Evidencia evaluada', en: 'Evidence assessed' },
    { code: 4, es: 'Replicado o revisado por independiente', en: 'Replicated or independently reviewed' },
    { code: 5, es: 'En disputa, sustituido o retirado', en: 'Contested, superseded or withdrawn' }
  ],

  sealDefs: [
    { key: 'persist', es: 'Identificador persistente', en: 'Persistent identifier' },
    { key: 'licence', es: 'Licencia declarada', en: 'Declared licence' },
    { key: 'affil', es: 'Afiliación con la cadena exacta', en: 'Affiliation with the exact string' },
    { key: 'review', es: 'Revisión externa identificable', en: 'Identifiable external review' },
    { key: 'trace', es: 'Registro o versionado público', en: 'Public register or versioning' }
  ],

  /* modos de lectura: misma fuente, distinta pregunta */
  modes: [
    {
      id: 'community', es: { name: 'Comunidad', ask: '¿Qué existe y qué está activo?' },
      en: { name: 'Community', ask: 'What exists and what is active?' },
      layers: { flow: true, density: true, gravity: false, risk: false, evidence: false }
    },
    {
      id: 'research', es: { name: 'Investigación', ask: '¿Dónde están los vacíos y las lagunas de trazabilidad?' },
      en: { name: 'Research', ask: 'Where are the voids and the traceability gaps?' },
      layers: { flow: true, density: false, gravity: false, risk: false, evidence: true }
    },
    {
      id: 'operator', es: { name: 'Operación', ask: '¿Qué depende de qué y qué está cerrado?' },
      en: { name: 'Operator', ask: 'What depends on what, and what is closed?' },
      layers: { flow: false, density: false, gravity: true, risk: true, evidence: false }
    },
    {
      id: 'authority', es: { name: 'Supervisión', ask: '¿Qué puede autorizar y qué no?' },
      en: { name: 'Oversight', ask: 'What may be authorised and what may not?' },
      layers: { flow: true, density: false, gravity: true, risk: true, evidence: true }
    }
  ],

  /* etiquetas de estado de activación (campo propio del nodo) */
  activations: {
    activo: { es: 'Activo y verificable', en: 'Active and verifiable' },
    parcial: { es: 'Parcial: existe con brechas', en: 'Partial: it exists with gaps' },
    propuesto: { es: 'Propuesto, sin implementación verificable', en: 'Proposed, no verifiable implementation' },
    'no-poblado': { es: 'Diseñado, no poblado', en: 'Designed, not populated' },
    'cerrado-por-diseno': { es: 'Cerrado por diseño', en: 'Closed by design' },
    vacio: { es: 'Vacío declarado', en: 'Declared void' }
  }
};
