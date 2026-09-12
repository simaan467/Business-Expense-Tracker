const STORAGE_KEYS = Object.freeze({
  investors: "investors",
  supervisors: "supervisors",
  projects: "projects",
  transactions: "transactions",
  language: "language"
});

const DEFAULT_LANGUAGE = "en";

// Attach the signed-in user's short-lived token to every protected API call.
const browserFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const requestUrl = typeof input === "string" ? input : input.url;
  const token = sessionStorage.getItem("authToken");
  if (!token || !String(requestUrl).includes("/api/")) return browserFetch(input, init);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return browserFetch(input, { ...init, headers });
};

const SUPPORTED_LANGUAGES = Object.freeze({
  en: {
    locale: "en-IN",
    label: "English"
  },
  hi: {
    locale: "hi-IN",
    label: "हिन्दी"
  },
  kn: {
    locale: "kn-IN",
    label: "ಕನ್ನಡ"
  },
  ta: {
    locale: "ta-IN",
    label: "தமிழ்"
  },
  te: {
    locale: "te-IN",
    label: "తెలుగు"
  }
});

const TRANSLATIONS = Object.freeze({
  en: {
    common: {
      appName: "Steel Arts Ledger",
      navPrimary: "Primary",
      dashboard: "Dashboard",
      projects: "Projects",
      project: "Project",
      projectPage: "Project Page",
      projectList: "Project List",
      overview: "Overview",
      projectOverview: "Project overview",
      projectInvestors: "Project Investors",
      projectSupervisors: "Project Supervisors",
      projectEntries: "Project Entries",
      overallExpenses: "Overall Expenses",
      projectSpend: "Project Spend",
      funding: "Funding",
      directory: "Directory",
      create: "Create",
      portfolio: "Portfolio",
      projectFlow: "Project Flow",
      oneProjectAtATime: "One Project At A Time",
      quickView: "Quick View",
      filters: "Filters",
      dailyEntry: "Daily Entry",
      projectTeam: "Project Team",
      investorView: "Investor View",
      supervisorView: "Supervisor View",
      selectedProject: "Selected Project",
      projectActivity: "Project Activity",
      projectLedger: "Project Ledger",
      role: "Role",
      name: "Name",
      paidTo: "Paid To",
      amount: "Amount",
      date: "Date",
      totalExpenses: "Total Expenses",
      existingProject: "Existing project",
      investors: "Investors",
      supervisors: "Supervisors",
      investor: "Investor",
      supervisor: "Supervisor",
      member: "Member",
      members: "Members",
      entries: "Entries",
      expenseEntries: "Expense Entries",
      transactions: "Transactions",
      totalInvested: "Total Invested",
      totalSpent: "Total Spent",
      addInvestor: "Add Investor",
      addProject: "Add Project",
      addTransaction: "Add Transaction",
      addMoreMembers: "Add More Members",
      addToProject: "Add To Project",
      addNewInvestor: "+ Add New Investor",
      addNewSupervisor: "+ Add New Supervisor",
      remove: "Remove",
      saveTransaction: "Save Transaction",
      openProjectPage: "Open Project Page",
      manageProjects: "Manage projects",
      manageThisProject: "Manage this project",
      deleteProject: "Delete Project",
      assigned: "Assigned",
      historical: "Historical",
      status: "Status",
      visibleOnDashboard: "Visible on dashboard",
      asOwnProjectPage: "As its own project page",
      active: "Active",
      ready: "Ready",
      chooseRole: "Choose role",
      chooseMember: "Choose member",
      chooseExistingMember: "Choose existing member",
      chooseExistingInvestor: "Choose existing investor",
      chooseExistingSupervisor: "Choose existing supervisor",
      allRoles: "All Roles",
      allNames: "All Names",
      allPaidTo: "All Paid To",
      existingName: "Existing Name",
      newName: "New Name",
      language: "Language",
      languageEnglish: "English",
      languageHindi: "Hindi",
      languageKannada: "Kannada",
      languageTamil: "Tamil",
      languageTelugu: "Telugu"
    },
    dashboard: {
      title: "Steel Arts Dashboard",
      heroTitle: "Expense Dashboard",
      heroDescription:
        "Open one project at a time. Each project now lives on its own page with its own investors, supervisors, filters, entry form, and transaction ledger.",
      investorCaption: "Available to assign across projects",
      projectCaption: "Each opens on its own page",
      expenseCaption: "Across every project page",
      investorTitle: "Investors",
      investorInputPlaceholder: "Add investor name",
      investorInputAria: "Investor Name",
      projectPagesTitle: "Project Pages",
      chooseProjectNote:
        "Choose a project below to open its dedicated page. That page shows only the assigned investors and supervisors, plus only that project's entries and totals.",
      separateProjectPages: "Separate project pages",
      ownMembers: "Own members",
      ownFilters: "Own filters",
      emptyInvestors: "Add your first investor to start assigning expenses.",
      emptyProjects: "No projects yet. Add one on the Projects page to create a dedicated project ledger.",
      projectAdded: ({ date }) => `Added ${date}`,
      projectEntriesChip: ({ count }) => `${count} ${count === 1 ? "entry" : "entries"}`,
      projectAssignedInvestorsChip: ({ count }) =>
        `${count} assigned ${count === 1 ? "investor" : "investors"}`,
      projectAssignedSupervisorsChip: ({ count }) =>
        `${count} assigned ${count === 1 ? "supervisor" : "supervisors"}`,
      projectPageValue: "",
      alertEnterInvestorName: "Please enter investor name.",
      alertInvestorExists: "That investor already exists."
    },
    projectsPage: {
      title: "Steel Arts Projects",
      heroTitle: "Project Hub",
      heroDescription:
        "Organize every project in one place, then feed those names back into the dashboard for faster transaction entry.",
      createTitle: "Add Project",
      projectNamePlaceholder: "Enter project name",
      projectNameAria: "Project Name",
      createInvestorsTitle: "Project Investors",
      createInvestorsDescription: "Select existing investors or add as many new ones as you need",
      createSupervisorsTitle: "Project Supervisors",
      createSupervisorsDescription: "Supervisors will also log spend and entries just like investors",
      createHelper:
        "Choose existing members or add new ones while creating the project so its page is ready immediately.",
      statProjectCaption: "Currently tracked",
      statEntryCaption: "Across all projects",
      statSpendCaption: "All recorded expenses",
      noExistingInvestors: "No existing investors yet. Add new investor fields below.",
      noExistingSupervisors: "No existing supervisors yet. Add new supervisor fields below.",
      createMixHelper:
        "Choose existing members, add new investors, add new supervisors, or mix both roles while creating the project.",
      noProjectsList: "No projects yet. Add one above to start organizing your ledger.",
      noProjectsDetail: "Select a project from the list once you have created one.",
      selectProjectDetails: "Select a project to see its details.",
      projectListEntries: ({ count }) => `${count} ${count === 1 ? "entry" : "entries"}`,
      projectAdded: ({ date }) => `Added ${date}`,
      projectChipEntries: ({ count }) => `${count} ${count === 1 ? "entry" : "entries"}`,
      projectChipInvestors: ({ count }) => `${count} ${count === 1 ? "investor" : "investors"}`,
      projectChipSupervisors: ({ count }) =>
        `${count} ${count === 1 ? "supervisor" : "supervisors"}`,
      projectChipSpend: ({ amount }) => `${amount} total spend`,
      entriesForProject: ({ projectName }) => `Entries For ${projectName}`,
      noProjectExpenses: ({ projectName }) => `No expenses have been recorded for ${projectName} yet.`,
      dynamicFieldPlaceholder: ({ memberType }) => `Enter ${memberType.toLowerCase()} name`,
      dynamicFieldAria: ({ memberType }) => `New ${memberType.toLowerCase()} name`,
      alertEnterProjectName: "Please enter project name.",
      alertProjectExists: "That project already exists.",
      alertNeedOneMember: "Add at least one investor or supervisor for the new project.",
      deleteProjectConfirm: ({ projectName }) => `Delete "${projectName}"?`,
      deleteProjectConfirmWithEntries: ({ projectName, count, total }) =>
        `Delete "${projectName}"? This will also remove ${count} expense ${count === 1 ? "entry" : "entries"} worth ${total}.`
    },
    projectPage: {
      title: "Steel Arts Project",
      heroTitle: "Project Page",
      heroSubtitle:
        "This page is reserved for one project only, with its own investors, supervisors, filters, entry form, and transaction ledger.",
      investorCaption: "Assigned or historically used here",
      supervisorCaption: "Tracked only for this project",
      entryCaption: "Recorded inside this page",
      spendCaption: "All expenses for this project",
      investorStandings: "Investor Standings",
      supervisorStandings: "Supervisor Standings",
      paidToPlaceholder: "Vendor or person name",
      amountPlaceholder: "0.00",
      teamNote:
        "Need more investors or supervisors later? Add them here and they will become available immediately for this project.",
      newMemberPlaceholder: "Type a new member name",
      projectNotFound: "Project Not Found",
      projectNotFoundSubtitle:
        "This project page could not be loaded. Choose a project from the dashboard or the Projects page.",
      projectNotFoundBody:
        'No matching project was found. Go back to <a class="text-link" href="index.html">Dashboard</a> or open <a class="text-link" href="projects.html">Projects</a> to choose one.',
      heroSubtitleForProject: ({ projectName }) =>
        `Only ${projectName} data appears here, including its own investors, supervisors, filters, entry form, and ledger.`,
      transactionsTitle: ({ projectName }) => `${projectName} Transactions`,
      noAssignedMembers: ({ memberType }) => `No ${memberType.toLowerCase()}s are assigned to this project yet.`,
      helperAddMemberFirst: ({ projectName }) =>
        `Add at least one investor or supervisor to ${projectName} before logging expenses.`,
      helperNoAssignedRole: ({ memberType }) =>
        `No assigned ${memberType.toLowerCase()}s are ready for entry yet.`,
      helperOnlyAssigned: ({ memberType, projectName }) =>
        `Only assigned ${memberType.toLowerCase()}s for ${projectName} can be used here.`,
      memberManagerHelperChoose: ({ memberType }) =>
        `Choose an existing ${memberType.toLowerCase()} or type a brand-new one to add more members later.`,
      memberManagerHelperNone: ({ memberType }) =>
        `No extra ${memberType.toLowerCase()}s are available globally yet. Type a new name to add one.`,
      noExpensesMatch: ({ projectName }) => `No expenses match the current view for ${projectName}.`,
      alertFillTransactionFields: "Please fill all transaction fields.",
      alertChooseAssignedMember: ({ memberType }) =>
        `Choose a ${memberType.toLowerCase()} assigned to this project.`,
      alertChooseRoleFirst: "Choose a role first.",
      alertChooseExistingOrNewNotBoth: ({ memberType }) =>
        `Choose an existing ${memberType.toLowerCase()} or type a new ${memberType.toLowerCase()}, not both.`,
      alertChooseExistingOrNew: ({ memberType }) =>
        `Choose an existing ${memberType.toLowerCase()} or type a new ${memberType.toLowerCase()} name.`,
      alertAlreadyAssigned: ({ memberType }) =>
        `That ${memberType.toLowerCase()} is already assigned to this project.`
    }
  },
  hi: {
    common: {
      appName: "स्टील आर्ट्स लेजर",
      navPrimary: "मुख्य नेविगेशन",
      dashboard: "डैशबोर्ड",
      projects: "प्रोजेक्ट्स",
      project: "प्रोजेक्ट",
      projectPage: "प्रोजेक्ट पेज",
      projectList: "प्रोजेक्ट सूची",
      overview: "अवलोकन",
      projectOverview: "प्रोजेक्ट अवलोकन",
      projectInvestors: "प्रोजेक्ट निवेशक",
      projectSupervisors: "प्रोजेक्ट पर्यवेक्षक",
      projectEntries: "प्रोजेक्ट एंट्री",
      overallExpenses: "कुल खर्च",
      projectSpend: "प्रोजेक्ट खर्च",
      funding: "फंडिंग",
      directory: "डायरेक्टरी",
      create: "बनाएं",
      portfolio: "पोर्टफोलियो",
      projectFlow: "प्रोजेक्ट प्रवाह",
      oneProjectAtATime: "एक समय में एक प्रोजेक्ट",
      quickView: "त्वरित दृश्य",
      filters: "फ़िल्टर",
      dailyEntry: "दैनिक एंट्री",
      projectTeam: "प्रोजेक्ट टीम",
      investorView: "निवेशक दृश्य",
      supervisorView: "पर्यवेक्षक दृश्य",
      selectedProject: "चयनित प्रोजेक्ट",
      projectActivity: "प्रोजेक्ट गतिविधि",
      projectLedger: "प्रोजेक्ट लेजर",
      role: "भूमिका",
      name: "नाम",
      paidTo: "किसे भुगतान किया",
      amount: "राशि",
      date: "तारीख",
      totalExpenses: "कुल खर्च",
      existingProject: "मौजूदा प्रोजेक्ट",
      investors: "निवेशक",
      supervisors: "पर्यवेक्षक",
      investor: "निवेशक",
      supervisor: "पर्यवेक्षक",
      member: "सदस्य",
      members: "सदस्य",
      entries: "एंट्री",
      expenseEntries: "खर्च एंट्री",
      transactions: "लेनदेन",
      totalInvested: "कुल निवेश",
      totalSpent: "कुल खर्च",
      addInvestor: "निवेशक जोड़ें",
      addProject: "प्रोजेक्ट जोड़ें",
      addTransaction: "लेनदेन जोड़ें",
      addMoreMembers: "और सदस्य जोड़ें",
      addToProject: "प्रोजेक्ट में जोड़ें",
      addNewInvestor: "+ नया निवेशक जोड़ें",
      addNewSupervisor: "+ नया पर्यवेक्षक जोड़ें",
      remove: "हटाएं",
      saveTransaction: "लेनदेन सहेजें",
      openProjectPage: "प्रोजेक्ट पेज खोलें",
      manageProjects: "प्रोजेक्ट प्रबंधित करें",
      manageThisProject: "इस प्रोजेक्ट को प्रबंधित करें",
      deleteProject: "प्रोजेक्ट हटाएं",
      assigned: "असाइन किया गया",
      historical: "पुराना रिकॉर्ड",
      status: "स्थिति",
      visibleOnDashboard: "डैशबोर्ड पर दिखाई देता है",
      asOwnProjectPage: "अपने अलग प्रोजेक्ट पेज के रूप में",
      active: "सक्रिय",
      ready: "तैयार",
      chooseRole: "भूमिका चुनें",
      chooseMember: "सदस्य चुनें",
      chooseExistingMember: "मौजूदा सदस्य चुनें",
      chooseExistingInvestor: "मौजूदा निवेशक चुनें",
      chooseExistingSupervisor: "मौजूदा पर्यवेक्षक चुनें",
      allRoles: "सभी भूमिकाएं",
      allNames: "सभी नाम",
      allPaidTo: "सभी भुगतान प्राप्तकर्ता",
      existingName: "मौजूदा नाम",
      newName: "नया नाम",
      language: "भाषा",
      languageEnglish: "अंग्रेज़ी",
      languageHindi: "हिंदी",
      languageKannada: "कन्नड़",
      languageTamil: "तमिल",
      languageTelugu: "तेलुगु"
    },
    dashboard: {
      title: "स्टील आर्ट्स डैशबोर्ड",
      heroTitle: "खर्च डैशबोर्ड",
      heroDescription:
        "एक समय में एक प्रोजेक्ट खोलें। अब हर प्रोजेक्ट का अपना अलग पेज है जिसमें उसके निवेशक, पर्यवेक्षक, फ़िल्टर, एंट्री फ़ॉर्म और लेजर शामिल हैं।",
      investorCaption: "प्रोजेक्ट्स में असाइन करने के लिए उपलब्ध",
      projectCaption: "हर एक अपने अलग पेज पर खुलता है",
      expenseCaption: "सभी प्रोजेक्ट पेजों में",
      investorTitle: "निवेशक",
      investorInputPlaceholder: "निवेशक का नाम जोड़ें",
      investorInputAria: "निवेशक का नाम",
      projectPagesTitle: "प्रोजेक्ट पेज",
      chooseProjectNote:
        "नीचे से कोई प्रोजेक्ट चुनें और उसका समर्पित पेज खोलें। उस पेज पर केवल वही निवेशक, पर्यवेक्षक, एंट्री और कुल राशि दिखाई जाएगी जो उस प्रोजेक्ट से जुड़ी है।",
      separateProjectPages: "अलग प्रोजेक्ट पेज",
      ownMembers: "अलग सदस्य",
      ownFilters: "अलग फ़िल्टर",
      emptyInvestors: "खर्च असाइन करना शुरू करने के लिए अपना पहला निवेशक जोड़ें।",
      emptyProjects: "अभी कोई प्रोजेक्ट नहीं है। अलग प्रोजेक्ट लेजर बनाने के लिए Projects पेज पर एक प्रोजेक्ट जोड़ें।",
      projectAdded: ({ date }) => `जोड़ा गया: ${date}`,
      projectEntriesChip: ({ count }) => `${count} एंट्री`,
      projectAssignedInvestorsChip: ({ count }) => `${count} असाइन किए गए निवेशक`,
      projectAssignedSupervisorsChip: ({ count }) => `${count} असाइन किए गए पर्यवेक्षक`,
      projectPageValue: "अलग सदस्य और फ़िल्टर",
      alertEnterInvestorName: "कृपया निवेशक का नाम दर्ज करें।",
      alertInvestorExists: "यह निवेशक पहले से मौजूद है।"
    },
    projectsPage: {
      title: "स्टील आर्ट्स प्रोजेक्ट्स",
      heroTitle: "प्रोजेक्ट हब",
      heroDescription:
        "सभी प्रोजेक्ट्स को एक जगह व्यवस्थित करें, फिर उनके नाम डैशबोर्ड में इस्तेमाल करें ताकि लेनदेन एंट्री तेज़ हो सके।",
      createTitle: "प्रोजेक्ट जोड़ें",
      projectNamePlaceholder: "प्रोजेक्ट का नाम दर्ज करें",
      projectNameAria: "प्रोजेक्ट का नाम",
      createInvestorsTitle: "प्रोजेक्ट निवेशक",
      createInvestorsDescription: "मौजूदा निवेशक चुनें या जरूरत के अनुसार नए जोड़ें",
      createSupervisorsTitle: "प्रोजेक्ट पर्यवेक्षक",
      createSupervisorsDescription: "पर्यवेक्षक भी निवेशकों की तरह खर्च और एंट्री दर्ज करेंगे",
      createHelper:
        "प्रोजेक्ट बनाते समय मौजूदा सदस्य चुनें या नए जोड़ें ताकि उसका पेज तुरंत तैयार हो जाए।",
      statProjectCaption: "अभी ट्रैक किए जा रहे",
      statEntryCaption: "सभी प्रोजेक्ट्स में",
      statSpendCaption: "सभी दर्ज खर्च",
      noExistingInvestors: "अभी कोई मौजूदा निवेशक नहीं है। नीचे नए निवेशक जोड़ें।",
      noExistingSupervisors: "अभी कोई मौजूदा पर्यवेक्षक नहीं है। नीचे नए पर्यवेक्षक जोड़ें।",
      createMixHelper:
        "मौजूदा सदस्य चुनें, नए निवेशक जोड़ें, नए पर्यवेक्षक जोड़ें, या दोनों भूमिकाओं का मिश्रण रखें।",
      noProjectsList: "अभी कोई प्रोजेक्ट नहीं है। अपना लेजर व्यवस्थित करना शुरू करने के लिए ऊपर एक प्रोजेक्ट जोड़ें।",
      noProjectsDetail: "एक बार प्रोजेक्ट बन जाने पर सूची से उसे चुनें।",
      selectProjectDetails: "विवरण देखने के लिए कोई प्रोजेक्ट चुनें।",
      projectListEntries: ({ count }) => `${count} एंट्री`,
      projectAdded: ({ date }) => `जोड़ा गया: ${date}`,
      projectChipEntries: ({ count }) => `${count} एंट्री`,
      projectChipInvestors: ({ count }) => `${count} निवेशक`,
      projectChipSupervisors: ({ count }) => `${count} पर्यवेक्षक`,
      projectChipSpend: ({ amount }) => `${amount} कुल खर्च`,
      entriesForProject: ({ projectName }) => `${projectName} की एंट्री`,
      noProjectExpenses: ({ projectName }) => `${projectName} के लिए अभी तक कोई खर्च दर्ज नहीं किया गया है।`,
      dynamicFieldPlaceholder: ({ memberType }) => `${memberType} का नाम दर्ज करें`,
      dynamicFieldAria: ({ memberType }) => `नया ${memberType} नाम`,
      alertEnterProjectName: "कृपया प्रोजेक्ट का नाम दर्ज करें।",
      alertProjectExists: "यह प्रोजेक्ट पहले से मौजूद है।",
      alertNeedOneMember: "नए प्रोजेक्ट के लिए कम से कम एक निवेशक या पर्यवेक्षक जोड़ें।",
      deleteProjectConfirm: ({ projectName }) => `"${projectName}" हटाना है?`,
      deleteProjectConfirmWithEntries: ({ projectName, count, total }) =>
        `"${projectName}" हटाना है? इसके साथ ${count} खर्च एंट्री भी हटेंगी जिनकी कुल राशि ${total} है।`
    },
    projectPage: {
      title: "स्टील आर्ट्स प्रोजेक्ट",
      heroTitle: "प्रोजेक्ट पेज",
      heroSubtitle:
        "यह पेज केवल एक प्रोजेक्ट के लिए है, जिसमें उसके निवेशक, पर्यवेक्षक, फ़िल्टर, एंट्री फ़ॉर्म और लेजर शामिल हैं।",
      investorCaption: "यहां असाइन किए गए या पहले उपयोग किए गए",
      supervisorCaption: "केवल इस प्रोजेक्ट के लिए ट्रैक किए गए",
      entryCaption: "इसी पेज के अंदर दर्ज",
      spendCaption: "इस प्रोजेक्ट के सभी खर्च",
      investorStandings: "निवेशक स्थिति",
      supervisorStandings: "पर्यवेक्षक स्थिति",
      paidToPlaceholder: "विक्रेता या व्यक्ति का नाम",
      amountPlaceholder: "0.00",
      teamNote:
        "बाद में और निवेशक या पर्यवेक्षक चाहिए? उन्हें यहां जोड़ें और वे तुरंत इस प्रोजेक्ट में उपलब्ध हो जाएंगे।",
      newMemberPlaceholder: "नए सदस्य का नाम लिखें",
      projectNotFound: "प्रोजेक्ट नहीं मिला",
      projectNotFoundSubtitle:
        "यह प्रोजेक्ट पेज लोड नहीं हो सका। डैशबोर्ड या Projects पेज से कोई प्रोजेक्ट चुनें।",
      projectNotFoundBody:
        'कोई मेल खाता प्रोजेक्ट नहीं मिला। वापस <a class="text-link" href="index.html">Dashboard</a> जाएं या <a class="text-link" href="projects.html">Projects</a> खोलकर कोई प्रोजेक्ट चुनें।',
      heroSubtitleForProject: ({ projectName }) =>
        `यहां केवल ${projectName} का डेटा दिखाई देता है, जिसमें उसके निवेशक, पर्यवेक्षक, फ़िल्टर, एंट्री फ़ॉर्म और लेजर शामिल हैं।`,
      transactionsTitle: ({ projectName }) => `${projectName} लेनदेन`,
      noAssignedMembers: ({ memberType }) => `अभी इस प्रोजेक्ट में कोई ${memberType} असाइन नहीं है।`,
      helperAddMemberFirst: ({ projectName }) =>
        `${projectName} में खर्च दर्ज करने से पहले कम से कम एक निवेशक या पर्यवेक्षक जोड़ें।`,
      helperNoAssignedRole: ({ memberType }) => `अभी कोई असाइन किया गया ${memberType} एंट्री के लिए तैयार नहीं है।`,
      helperOnlyAssigned: ({ memberType, projectName }) =>
        `${projectName} में केवल असाइन किए गए ${memberType} ही यहां इस्तेमाल किए जा सकते हैं।`,
      memberManagerHelperChoose: ({ memberType }) =>
        `मौजूदा ${memberType} चुनें या नया नाम लिखें ताकि बाद में और सदस्य जोड़े जा सकें।`,
      memberManagerHelperNone: ({ memberType }) =>
        `अभी वैश्विक सूची में कोई अतिरिक्त ${memberType} उपलब्ध नहीं है। नया नाम लिखकर जोड़ें।`,
      noExpensesMatch: ({ projectName }) => `${projectName} के लिए वर्तमान दृश्य से कोई खर्च मेल नहीं खाता।`,
      alertFillTransactionFields: "कृपया सभी लेनदेन फ़ील्ड भरें।",
      alertChooseAssignedMember: ({ memberType }) => `इस प्रोजेक्ट में असाइन किया गया ${memberType} चुनें।`,
      alertChooseRoleFirst: "पहले भूमिका चुनें।",
      alertChooseExistingOrNewNotBoth: ({ memberType }) =>
        `मौजूदा ${memberType} चुनें या नया ${memberType} लिखें, दोनों नहीं।`,
      alertChooseExistingOrNew: ({ memberType }) =>
        `मौजूदा ${memberType} चुनें या नया ${memberType} नाम लिखें।`,
      alertAlreadyAssigned: ({ memberType }) => `यह ${memberType} पहले से इस प्रोजेक्ट में असाइन है।`
    }
  },
  kn: {
    common: {
      appName: "ಸ್ಟೀಲ್ ಆರ್ಟ್ಸ್ ಲೆಡ್ಜರ್",
      navPrimary: "ಮುಖ್ಯ ನ್ಯಾವಿಗೇಶನ್",
      dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      projects: "ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು",
      project: "ಪ್ರಾಜೆಕ್ಟ್",
      projectPage: "ಪ್ರಾಜೆಕ್ಟ್ ಪುಟ",
      projectList: "ಪ್ರಾಜೆಕ್ಟ್ ಪಟ್ಟಿ",
      overview: "ಒಟ್ಟಾರೆ ನೋಟ",
      projectOverview: "ಪ್ರಾಜೆಕ್ಟ್ ಒಟ್ಟಾರೆ ನೋಟ",
      projectInvestors: "ಪ್ರಾಜೆಕ್ಟ್ ಹೂಡಿಕೆದಾರರು",
      projectSupervisors: "ಪ್ರಾಜೆಕ್ಟ್ ಮೇಲ್ವಿಚಾರಕರು",
      projectEntries: "ಪ್ರಾಜೆಕ್ಟ್ ನೋಂದಣಿಗಳು",
      overallExpenses: "ಒಟ್ಟು ವೆಚ್ಚ",
      projectSpend: "ಪ್ರಾಜೆಕ್ಟ್ ವೆಚ್ಚ",
      funding: "ಹಣಕಾಸು",
      directory: "ಡೈರೆಕ್ಟರಿ",
      create: "ರಚಿಸಿ",
      portfolio: "ಪೋರ್ಟ್‌ಫೋಲಿಯೊ",
      projectFlow: "ಪ್ರಾಜೆಕ್ಟ್ ಪ್ರವಾಹ",
      oneProjectAtATime: "ಒಂದು ಸಮಯಕ್ಕೆ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್",
      quickView: "ತ್ವರಿತ ನೋಟ",
      filters: "ಫಿಲ್ಟರ್‌ಗಳು",
      dailyEntry: "ದೈನಂದಿನ ನೋಂದಣಿ",
      projectTeam: "ಪ್ರಾಜೆಕ್ಟ್ ತಂಡ",
      investorView: "ಹೂಡಿಕೆದಾರರ ನೋಟ",
      supervisorView: "ಮೇಲ್ವಿಚಾರಕರ ನೋಟ",
      selectedProject: "ಆಯ್ಕೆಯಾದ ಪ್ರಾಜೆಕ್ಟ್",
      projectActivity: "ಪ್ರಾಜೆಕ್ಟ್ ಚಟುವಟಿಕೆ",
      projectLedger: "ಪ್ರಾಜೆಕ್ಟ್ ಲೆಡ್ಜರ್",
      role: "ಪಾತ್ರ",
      name: "ಹೆಸರು",
      paidTo: "ಪಾವತಿಸಿದವರು",
      amount: "ಮೊತ್ತ",
      date: "ದಿನಾಂಕ",
      totalExpenses: "ಒಟ್ಟು ವೆಚ್ಚ",
      existingProject: "ಈಗಿರುವ ಪ್ರಾಜೆಕ್ಟ್",
      investors: "ಹೂಡಿಕೆದಾರರು",
      supervisors: "ಮೇಲ್ವಿಚಾರಕರು",
      investor: "ಹೂಡಿಕೆದಾರ",
      supervisor: "ಮೇಲ್ವಿಚಾರಕ",
      member: "ಸದಸ್ಯ",
      members: "ಸದಸ್ಯರು",
      entries: "ನೋಂದಣಿಗಳು",
      expenseEntries: "ವೆಚ್ಚ ನೋಂದಣಿಗಳು",
      transactions: "ವಹಿವಾಟುಗಳು",
      totalInvested: "ಒಟ್ಟು ಹೂಡಿಕೆ",
      totalSpent: "ಒಟ್ಟು ವೆಚ್ಚ",
      addInvestor: "ಹೂಡಿಕೆದಾರರನ್ನು ಸೇರಿಸಿ",
      addProject: "ಪ್ರಾಜೆಕ್ಟ್ ಸೇರಿಸಿ",
      addTransaction: "ವಹಿವಾಟು ಸೇರಿಸಿ",
      addMoreMembers: "ಹೆಚ್ಚು ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ",
      addToProject: "ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
      addNewInvestor: "+ ಹೊಸ ಹೂಡಿಕೆದಾರರನ್ನು ಸೇರಿಸಿ",
      addNewSupervisor: "+ ಹೊಸ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಸೇರಿಸಿ",
      remove: "ಅಳಿಸಿ",
      saveTransaction: "ವಹಿವಾಟು ಉಳಿಸಿ",
      openProjectPage: "ಪ್ರಾಜೆಕ್ಟ್ ಪುಟ ತೆರೆಯಿರಿ",
      manageProjects: "ಪ್ರಾಜೆಕ್ಟ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
      manageThisProject: "ಈ ಪ್ರಾಜೆಕ್ಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಿ",
      deleteProject: "ಪ್ರಾಜೆಕ್ಟ್ ಅಳಿಸಿ",
      assigned: "ನಿಯೋಜಿತ",
      historical: "ಹಿಂದಿನ ದಾಖಲೆ",
      status: "ಸ್ಥಿತಿ",
      visibleOnDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ",
      asOwnProjectPage: "ಪ್ರತ್ಯೇಕ ಪ್ರಾಜೆಕ್ಟ್ ಪುಟವಾಗಿ",
      active: "ಸಕ್ರಿಯ",
      ready: "ಸಿದ್ಧ",
      chooseRole: "ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      chooseMember: "ಸದಸ್ಯರನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      chooseExistingMember: "ಈಗಿರುವ ಸದಸ್ಯರನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      chooseExistingInvestor: "ಈಗಿರುವ ಹೂಡಿಕೆದಾರರನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      chooseExistingSupervisor: "ಈಗಿರುವ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      allRoles: "ಎಲ್ಲಾ ಪಾತ್ರಗಳು",
      allNames: "ಎಲ್ಲಾ ಹೆಸರುಗಳು",
      allPaidTo: "ಎಲ್ಲಾ ಪಾವತಿ ಸ್ವೀಕರಿಸುವವರು",
      existingName: "ಈಗಿರುವ ಹೆಸರು",
      newName: "ಹೊಸ ಹೆಸರು",
      language: "ಭಾಷೆ",
      languageEnglish: "ಇಂಗ್ಲಿಷ್",
      languageHindi: "ಹಿಂದಿ",
      languageKannada: "ಕನ್ನಡ",
      languageTamil: "ತಮಿಳು",
      languageTelugu: "ತೆಲುಗು"
    },
    dashboard: {
      title: "ಸ್ಟೀಲ್ ಆರ್ಟ್ಸ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      heroTitle: "ವೆಚ್ಚ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      heroDescription:
        "ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ತೆರೆಯಿರಿ. ಈಗ ಪ್ರತಿಯೊಂದು ಪ್ರಾಜೆಕ್ಟ್‌ಗೂ ಅದರದೇ ಪುಟವಿದ್ದು ಅದರಲ್ಲಿ ಹೂಡಿಕೆದಾರರು, ಮೇಲ್ವಿಚಾರಕರು, ಫಿಲ್ಟರ್‌ಗಳು, ನೋಂದಣಿ ಫಾರ್ಮ್ ಮತ್ತು ವ್ಯವಹಾರ ಲೆಡ್ಜರ್ ಇದೆ.",
      investorCaption: "ಪ್ರಾಜೆಕ್ಟ್‌ಗಳಿಗೆ ನಿಯೋಜಿಸಲು ಲಭ್ಯ",
      projectCaption: "ಪ್ರತಿಯೊಂದೂ ತನ್ನದೇ ಪುಟದಲ್ಲಿ ತೆರೆಯುತ್ತದೆ",
      expenseCaption: "ಎಲ್ಲಾ ಪ್ರಾಜೆಕ್ಟ್ ಪುಟಗಳಾದ್ಯಂತ",
      investorTitle: "ಹೂಡಿಕೆದಾರರು",
      investorInputPlaceholder: "ಹೂಡಿಕೆದಾರರ ಹೆಸರನ್ನು ಸೇರಿಸಿ",
      investorInputAria: "ಹೂಡಿಕೆದಾರರ ಹೆಸರು",
      projectPagesTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಪುಟಗಳು",
      chooseProjectNote:
        "ಕೆಳಗಿನಿಂದ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಆಯ್ಕೆಮಾಡಿ ಅದರ ಸಮರ್ಪಿತ ಪುಟ ತೆರೆದುಕೊಳ್ಳಿ. ಆ ಪುಟದಲ್ಲಿ ಆ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ನಿಯೋಜಿತ ಹೂಡಿಕೆದಾರರು, ಮೇಲ್ವಿಚಾರಕರು, ನೋಂದಣಿಗಳು ಮತ್ತು ಮೊತ್ತಗಳಷ್ಟೇ ಕಾಣಿಸುತ್ತವೆ.",
      separateProjectPages: "ಪ್ರತ್ಯೇಕ ಪ್ರಾಜೆಕ್ಟ್ ಪುಟಗಳು",
      ownMembers: "ಸ್ವಂತ ಸದಸ್ಯರು",
      ownFilters: "ಸ್ವಂತ ಫಿಲ್ಟರ್‌ಗಳು",
      emptyInvestors: "ವೆಚ್ಚಗಳನ್ನು ನಿಯೋಜಿಸಲು ನಿಮ್ಮ ಮೊದಲ ಹೂಡಿಕೆದಾರರನ್ನು ಸೇರಿಸಿ.",
      emptyProjects: "ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಾಜೆಕ್ಟ್ ಇಲ್ಲ. ಸಮರ್ಪಿತ ಪ್ರಾಜೆಕ್ಟ್ ಲೆಡ್ಜರ್ ರಚಿಸಲು Projects ಪುಟದಲ್ಲಿ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಸೇರಿಸಿ.",
      projectAdded: ({ date }) => `ಸೇರಿಸಿದ ದಿನಾಂಕ ${date}`,
      projectEntriesChip: ({ count }) => `${count} ನೋಂದಣಿಗಳು`,
      projectAssignedInvestorsChip: ({ count }) => `${count} ನಿಯೋಜಿತ ಹೂಡಿಕೆದಾರರು`,
      projectAssignedSupervisorsChip: ({ count }) => `${count} ನಿಯೋಜಿತ ಮೇಲ್ವಿಚಾರಕರು`,
      projectPageValue: "ಸ್ವಂತ ಸದಸ್ಯರು ಮತ್ತು ಫಿಲ್ಟರ್‌ಗಳು",
      alertEnterInvestorName: "ದಯವಿಟ್ಟು ಹೂಡಿಕೆದಾರರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
      alertInvestorExists: "ಆ ಹೂಡಿಕೆದಾರರು ಈಗಾಗಲೇ ಇದ್ದಾರೆ."
    },
    projectsPage: {
      title: "ಸ್ಟೀಲ್ ಆರ್ಟ್ಸ್ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು",
      heroTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಹಬ್",
      heroDescription:
        "ಎಲ್ಲಾ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳನ್ನು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ವ್ಯವಸ್ಥೆಗೊಳಿಸಿ, ನಂತರ ವೇಗವಾದ ವ್ಯವಹಾರ ನೋಂದಣಿಗಾಗಿ ಅವುಗಳ ಹೆಸರುಗಳನ್ನು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಬಳಸಿ.",
      createTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಸೇರಿಸಿ",
      projectNamePlaceholder: "ಪ್ರಾಜೆಕ್ಟ್ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
      projectNameAria: "ಪ್ರಾಜೆಕ್ಟ್ ಹೆಸರು",
      createInvestorsTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಹೂಡಿಕೆದಾರರು",
      createInvestorsDescription: "ಈಗಿರುವ ಹೂಡಿಕೆದಾರರನ್ನು ಆರಿಸಿ ಅಥವಾ ಬೇಕಾದಷ್ಟು ಹೊಸವರನ್ನು ಸೇರಿಸಿ",
      createSupervisorsTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಮೇಲ್ವಿಚಾರಕರು",
      createSupervisorsDescription: "ಮೇಲ್ವಿಚಾರಕರು ಕೂಡ ಹೂಡಿಕೆದಾರರಂತೆಯೇ ವೆಚ್ಚ ಮತ್ತು ನೋಂದಣಿಗಳನ್ನು ದಾಖಲಿಸುತ್ತಾರೆ",
      createHelper:
        "ಪ್ರಾಜೆಕ್ಟ್ ರಚಿಸುವಾಗ ಈಗಿರುವ ಸದಸ್ಯರನ್ನು ಆರಿಸಿ ಅಥವಾ ಹೊಸವರನ್ನು ಸೇರಿಸಿ, ಹೀಗಾಗಿ ಅದರ ಪುಟ ತಕ್ಷಣ ಸಿದ್ಧವಾಗುತ್ತದೆ.",
      statProjectCaption: "ಪ್ರಸ್ತುತ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತಿದೆ",
      statEntryCaption: "ಎಲ್ಲಾ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳಾದ್ಯಂತ",
      statSpendCaption: "ಎಲ್ಲಾ ದಾಖಲಾಗಿರುವ ವೆಚ್ಚಗಳು",
      noExistingInvestors: "ಈಗಿರುವ ಹೂಡಿಕೆದಾರರು ಇನ್ನೂ ಇಲ್ಲ. ಕೆಳಗೆ ಹೊಸ ಹೂಡಿಕೆದಾರರ ಕ್ಷೇತ್ರಗಳನ್ನು ಸೇರಿಸಿ.",
      noExistingSupervisors: "ಈಗಿರುವ ಮೇಲ್ವಿಚಾರಕರು ಇನ್ನೂ ಇಲ್ಲ. ಕೆಳಗೆ ಹೊಸ ಮೇಲ್ವಿಚಾರಕರ ಕ್ಷೇತ್ರಗಳನ್ನು ಸೇರಿಸಿ.",
      createMixHelper:
        "ಈಗಿರುವ ಸದಸ್ಯರನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಹೊಸ ಹೂಡಿಕೆದಾರರನ್ನು ಸೇರಿಸಿ, ಹೊಸ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಸೇರಿಸಿ, ಅಥವಾ ಎರಡು ಪಾತ್ರಗಳ ಮಿಶ್ರಣವನ್ನು ಬಳಸಿ.",
      noProjectsList: "ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಾಜೆಕ್ಟ್ ಇಲ್ಲ. ನಿಮ್ಮ ಲೆಡ್ಜರ್ ಅನ್ನು ವ್ಯವಸ್ಥೆಗೊಳಿಸಲು ಮೇಲಿನಿಂದ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಸೇರಿಸಿ.",
      noProjectsDetail: "ಪ್ರಾಜೆಕ್ಟ್ ರಚಿಸಿದ ನಂತರ ಪಟ್ಟಿಯಿಂದ ಅದನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      selectProjectDetails: "ವಿವರಗಳನ್ನು ನೋಡಲು ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಆಯ್ಕೆಮಾಡಿ.",
      projectListEntries: ({ count }) => `${count} ನೋಂದಣಿಗಳು`,
      projectAdded: ({ date }) => `ಸೇರಿಸಿದ ದಿನಾಂಕ ${date}`,
      projectChipEntries: ({ count }) => `${count} ನೋಂದಣಿಗಳು`,
      projectChipInvestors: ({ count }) => `${count} ಹೂಡಿಕೆದಾರರು`,
      projectChipSupervisors: ({ count }) => `${count} ಮೇಲ್ವಿಚಾರಕರು`,
      projectChipSpend: ({ amount }) => `${amount} ಒಟ್ಟು ವೆಚ್ಚ`,
      entriesForProject: ({ projectName }) => `${projectName}ಗಾಗಿ ನೋಂದಣಿಗಳು`,
      noProjectExpenses: ({ projectName }) => `${projectName}ಗಾಗಿ ಇನ್ನೂ ಯಾವುದೇ ವೆಚ್ಚ ದಾಖಲಾಗಿಲ್ಲ.`,
      dynamicFieldPlaceholder: ({ memberType }) => `${memberType} ಹೆಸರನ್ನು ನಮೂದಿಸಿ`,
      dynamicFieldAria: ({ memberType }) => `ಹೊಸ ${memberType} ಹೆಸರು`,
      alertEnterProjectName: "ದಯವಿಟ್ಟು ಪ್ರಾಜೆಕ್ಟ್ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
      alertProjectExists: "ಆ ಪ್ರಾಜೆಕ್ಟ್ ಈಗಾಗಲೇ ಇದೆ.",
      alertNeedOneMember: "ಹೊಸ ಪ್ರಾಜೆಕ್ಟ್‌ಗಾಗಿ ಕನಿಷ್ಠ ಒಬ್ಬ ಹೂಡಿಕೆದಾರ ಅಥವಾ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಸೇರಿಸಿ.",
      deleteProjectConfirm: ({ projectName }) => `"${projectName}" ಅಳಿಸಬೇಕೇ?`,
      deleteProjectConfirmWithEntries: ({ projectName, count, total }) =>
        `"${projectName}" ಅಳಿಸಬೇಕೇ? ಇದರಿಂದ ${count} ವೆಚ್ಚ ನೋಂದಣಿಗಳು ಮತ್ತು ${total} ಮೊತ್ತದ ದಾಖಲೆಗಳು ಕೂಡ ಅಳಿಸಲ್ಪಡುವವು.`
    },
    projectPage: {
      title: "ಸ್ಟೀಲ್ ಆರ್ಟ್ಸ್ ಪ್ರಾಜೆಕ್ಟ್",
      heroTitle: "ಪ್ರಾಜೆಕ್ಟ್ ಪುಟ",
      heroSubtitle:
        "ಈ ಪುಟವು ಒಂದು ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ಮಾತ್ರ ಮೀಸಲಾಗಿದ್ದು, ಅದರ ಸ್ವಂತ ಹೂಡಿಕೆದಾರರು, ಮೇಲ್ವಿಚಾರಕರು, ಫಿಲ್ಟರ್‌ಗಳು, ನೋಂದಣಿ ಫಾರ್ಮ್ ಮತ್ತು ಲೆಡ್ಜರ್ ಅನ್ನು ಒಳಗೊಂಡಿದೆ.",
      investorCaption: "ಇಲ್ಲಿ ನಿಯೋಜಿಸಲ್ಪಟ್ಟ ಅಥವಾ ಹಿಂದಿನ ಬಳಕೆಯಲ್ಲಿದ್ದವರು",
      supervisorCaption: "ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ಮಾತ್ರ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗಿದೆ",
      entryCaption: "ಈ ಪುಟದಲ್ಲೇ ದಾಖಲಾಗುತ್ತದೆ",
      spendCaption: "ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ಸೇರಿದ ಎಲ್ಲಾ ವೆಚ್ಚಗಳು",
      investorStandings: "ಹೂಡಿಕೆದಾರರ ಸ್ಥಿತಿ",
      supervisorStandings: "ಮೇಲ್ವಿಚಾರಕರ ಸ್ಥಿತಿ",
      paidToPlaceholder: "ವಿಕ್ರೇತ ಅಥವಾ ವ್ಯಕ್ತಿಯ ಹೆಸರು",
      amountPlaceholder: "0.00",
      teamNote:
        "ನಂತರ ಇನ್ನಷ್ಟು ಹೂಡಿಕೆದಾರರು ಅಥವಾ ಮೇಲ್ವಿಚಾರಕರು ಬೇಕೇ? ಅವರನ್ನು ಇಲ್ಲಿ ಸೇರಿಸಿದರೆ ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ತಕ್ಷಣ ಲಭ್ಯವಾಗುತ್ತಾರೆ.",
      newMemberPlaceholder: "ಹೊಸ ಸದಸ್ಯರ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ",
      projectNotFound: "ಪ್ರಾಜೆಕ್ಟ್ ಕಂಡುಬಂದಿಲ್ಲ",
      projectNotFoundSubtitle:
        "ಈ ಪ್ರಾಜೆಕ್ಟ್ ಪುಟವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಅಥವಾ Projects ಪುಟದಿಂದ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಆಯ್ಕೆಮಾಡಿ.",
      projectNotFoundBody:
        'ಹೊಂದಾಣಿಕೆಯ ಪ್ರಾಜೆಕ್ಟ್ ಕಂಡುಬಂದಿಲ್ಲ. <a class="text-link" href="index.html">Dashboard</a> ಗೆ ಹಿಂತಿರುಗಿ ಅಥವಾ <a class="text-link" href="projects.html">Projects</a> ತೆರೆಯಿರಿ.',
      heroSubtitleForProject: ({ projectName }) =>
        `ಇಲ್ಲಿ ${projectName} ಗೆ ಸಂಬಂಧಿಸಿದ ಡೇಟಾ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ, ಅದರಲ್ಲಿ ಅದರ ಹೂಡಿಕೆದಾರರು, ಮೇಲ್ವಿಚಾರಕರು, ಫಿಲ್ಟರ್‌ಗಳು, ನೋಂದಣಿ ಫಾರ್ಮ್ ಮತ್ತು ಲೆಡ್ಜರ್ ಸೇರಿವೆ.`,
      transactionsTitle: ({ projectName }) => `${projectName} ವ್ಯವಹಾರಗಳು`,
      noAssignedMembers: ({ memberType }) => `ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ಇನ್ನೂ ಯಾವುದೇ ${memberType} ನಿಯೋಜಿಸಲ್ಪಟ್ಟಿಲ್ಲ.`,
      helperAddMemberFirst: ({ projectName }) =>
        `${projectName} ನಲ್ಲಿ ವೆಚ್ಚಗಳನ್ನು ದಾಖಲಿಸುವ ಮೊದಲು ಕನಿಷ್ಠ ಒಬ್ಬ ಹೂಡಿಕೆದಾರ ಅಥವಾ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಸೇರಿಸಿ.`,
      helperNoAssignedRole: ({ memberType }) =>
        `ನಿಯೋಜಿಸಲ್ಪಟ್ಟ ${memberType} ಗಳು ಇನ್ನೂ ನೋಂದಣಿಗೆ ಸಿದ್ಧವಾಗಿಲ್ಲ.`,
      helperOnlyAssigned: ({ memberType, projectName }) =>
        `${projectName}ಗಾಗಿ ನಿಯೋಜಿಸಲ್ಪಟ್ಟ ${memberType} ಗಳನ್ನೇ ಇಲ್ಲಿ ಬಳಸಬಹುದು.`,
      memberManagerHelperChoose: ({ memberType }) =>
        `ಈಗಿರುವ ${memberType} ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಹೊಸ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ, ನಂತರ ಇನ್ನಷ್ಟು ಸದಸ್ಯರನ್ನು ಸೇರಿಸಬಹುದು.`,
      memberManagerHelperNone: ({ memberType }) =>
        `ಜಾಗತಿಕ ಪಟ್ಟಿಯಲ್ಲಿ ಹೆಚ್ಚುವರಿ ${memberType} ಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ. ಹೊಸ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ ಸೇರಿಸಿ.`,
      noExpensesMatch: ({ projectName }) => `${projectName}ಗಾಗಿ ಪ್ರಸ್ತುತ ನೋಟಕ್ಕೆ ಹೊಂದುವ ವೆಚ್ಚಗಳಿಲ್ಲ.`,
      alertFillTransactionFields: "ದಯವಿಟ್ಟು ಎಲ್ಲಾ ವ್ಯವಹಾರ ಕ್ಷೇತ್ರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ.",
      alertChooseAssignedMember: ({ memberType }) =>
        `ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ನಿಯೋಜಿಸಲ್ಪಟ್ಟ ${memberType} ಆಯ್ಕೆಮಾಡಿ.`,
      alertChooseRoleFirst: "ಮೊದಲು ಒಂದು ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      alertChooseExistingOrNewNotBoth: ({ memberType }) =>
        `ಈಗಿರುವ ${memberType} ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಹೊಸ ${memberType} ನಮೂದಿಸಿ, ಎರಡನ್ನೂ ಒಂದೇ ವೇಳೆ ಬೇಡ.`,
      alertChooseExistingOrNew: ({ memberType }) =>
        `ಈಗಿರುವ ${memberType} ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಹೊಸ ${memberType} ಹೆಸರನ್ನು ನಮೂದಿಸಿ.`,
      alertAlreadyAssigned: ({ memberType }) =>
        `ಆ ${memberType} ಈಗಾಗಲೇ ಈ ಪ್ರಾಜೆಕ್ಟ್‌ಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ.`
    }
  },
  ta: {
    common: {
      appName: "ஸ்டீல் ஆர்ட்ஸ் லெட்ஜர்",
      navPrimary: "முக்கிய வழிச்செலுத்தல்",
      dashboard: "டாஷ்போர்டு",
      projects: "திட்டங்கள்",
      project: "திட்டம்",
      projectPage: "திட்டப் பக்கம்",
      projectList: "திட்டப் பட்டியல்",
      overview: "மேலோட்டம்",
      projectOverview: "திட்ட மேலோட்டம்",
      projectInvestors: "திட்ட முதலீட்டாளர்கள்",
      projectSupervisors: "திட்ட மேற்பார்வையாளர்கள்",
      projectEntries: "திட்ட பதிவுகள்",
      overallExpenses: "மொத்த செலவுகள்",
      projectSpend: "திட்ட செலவு",
      funding: "நிதி",
      directory: "அடைவு",
      create: "உருவாக்கு",
      portfolio: "போர்ட்ஃபோலியோ",
      projectFlow: "திட்ட ஓட்டம்",
      oneProjectAtATime: "ஒரு நேரத்தில் ஒரு திட்டம்",
      quickView: "விரைவு பார்வை",
      filters: "வடிகட்டிகள்",
      dailyEntry: "தினசரி பதிவு",
      projectTeam: "திட்டக் குழு",
      investorView: "முதலீட்டாளர் பார்வை",
      supervisorView: "மேற்பார்வையாளர் பார்வை",
      selectedProject: "தேர்ந்தெடுக்கப்பட்ட திட்டம்",
      projectActivity: "திட்ட செயல்பாடு",
      projectLedger: "திட்ட லெட்ஜர்",
      role: "பங்கு",
      name: "பெயர்",
      paidTo: "யாருக்கு செலுத்தப்பட்டது",
      amount: "தொகை",
      date: "தேதி",
      totalExpenses: "மொத்த செலவுகள்",
      existingProject: "ஏற்கனவே உள்ள திட்டம்",
      investors: "முதலீட்டாளர்கள்",
      supervisors: "மேற்பார்வையாளர்கள்",
      investor: "முதலீட்டாளர்",
      supervisor: "மேற்பார்வையாளர்",
      member: "உறுப்பினர்",
      members: "உறுப்பினர்கள்",
      entries: "பதிவுகள்",
      expenseEntries: "செலவுப் பதிவுகள்",
      transactions: "பரிவர்த்தனைகள்",
      totalInvested: "மொத்த முதலீடு",
      totalSpent: "மொத்த செலவு",
      addInvestor: "முதலீட்டாளரைச் சேர்க்கவும்",
      addProject: "திட்டத்தைச் சேர்க்கவும்",
      addTransaction: "பரிவர்த்தனையைச் சேர்க்கவும்",
      addMoreMembers: "மேலும் உறுப்பினர்களைச் சேர்க்கவும்",
      addToProject: "திட்டத்தில் சேர்க்கவும்",
      addNewInvestor: "+ புதிய முதலீட்டாளரைச் சேர்க்கவும்",
      addNewSupervisor: "+ புதிய மேற்பார்வையாளரைச் சேர்க்கவும்",
      remove: "அகற்று",
      saveTransaction: "பரிவர்த்தனையைச் சேமிக்கவும்",
      openProjectPage: "திட்டப் பக்கத்தைத் திறக்கவும்",
      manageProjects: "திட்டங்களை நிர்வகிக்கவும்",
      manageThisProject: "இந்தத் திட்டத்தை நிர்வகிக்கவும்",
      deleteProject: "திட்டத்தை நீக்கவும்",
      assigned: "ஒதுக்கப்பட்டது",
      historical: "முந்தைய பதிவு",
      status: "நிலை",
      visibleOnDashboard: "டாஷ்போர்டில் தெரியும்",
      asOwnProjectPage: "தனிப்பட்ட திட்டப் பக்கமாக",
      active: "செயலில்",
      ready: "தயார்",
      chooseRole: "பங்கையைத் தேர்வுசெய்க",
      chooseMember: "உறுப்பினரைத் தேர்வுசெய்க",
      chooseExistingMember: "ஏற்கனவே உள்ள உறுப்பினரைத் தேர்வுசெய்க",
      chooseExistingInvestor: "ஏற்கனவே உள்ள முதலீட்டாளரைத் தேர்வுசெய்க",
      chooseExistingSupervisor: "ஏற்கனவே உள்ள மேற்பார்வையாளரைத் தேர்வுசெய்க",
      allRoles: "அனைத்து பங்குகளும்",
      allNames: "அனைத்து பெயர்களும்",
      allPaidTo: "அனைத்து பெறுநர்களும்",
      existingName: "ஏற்கனவே உள்ள பெயர்",
      newName: "புதிய பெயர்",
      language: "மொழி",
      languageEnglish: "ஆங்கிலம்",
      languageHindi: "ஹிந்தி",
      languageKannada: "கன்னடம்",
      languageTamil: "தமிழ்",
      languageTelugu: "தெலுங்கு"
    },
    dashboard: {
      title: "ஸ்டீல் ஆர்ட்ஸ் டாஷ்போர்டு",
      heroTitle: "செலவு டாஷ்போர்டு",
      heroDescription:
        "ஒரு நேரத்தில் ஒரு திட்டத்தைத் திறக்கவும். இப்போது ஒவ்வொரு திட்டத்துக்கும் தனிப்பட்ட பக்கம் உள்ளது; அதில் அதன் முதலீட்டாளர்கள், மேற்பார்வையாளர்கள், வடிகட்டிகள், பதிவு படிவம் மற்றும் பரிவர்த்தனை லெட்ஜர் உள்ளன.",
      investorCaption: "திட்டங்களுக்கு ஒதுக்கத் தயாராக உள்ளது",
      projectCaption: "ஒவ்வொன்றும் தனித்துப் பக்கத்தில் திறக்கப்படுகிறது",
      expenseCaption: "அனைத்து திட்டப் பக்கங்களிலும்",
      investorTitle: "முதலீட்டாளர்கள்",
      investorInputPlaceholder: "முதலீட்டாளர் பெயரைச் சேர்க்கவும்",
      investorInputAria: "முதலீட்டாளர் பெயர்",
      projectPagesTitle: "திட்டப் பக்கங்கள்",
      chooseProjectNote:
        "கீழே இருந்து ஒரு திட்டத்தைத் தேர்வுசெய்து அதன் தனிப்பட்ட பக்கத்தைத் திறக்கவும். அந்தப் பக்கத்தில் அந்தத் திட்டத்துக்கு ஒதுக்கப்பட்ட முதலீட்டாளர்கள், மேற்பார்வையாளர்கள், பதிவுகள் மற்றும் மொத்தங்களே காணப்படும்.",
      separateProjectPages: "தனித்திட்டப் பக்கங்கள்",
      ownMembers: "தனிப்பட்ட உறுப்பினர்கள்",
      ownFilters: "தனிப்பட்ட வடிகட்டிகள்",
      emptyInvestors: "செலவுகளை ஒதுக்கத் தொடங்க உங்கள் முதல் முதலீட்டாளரைச் சேர்க்கவும்.",
      emptyProjects: "இன்னும் எந்தத் திட்டமும் இல்லை. தனிப்பட்ட திட்ட லெட்ஜரை உருவாக்க Projects பக்கத்தில் ஒரு திட்டத்தைச் சேர்க்கவும்.",
      projectAdded: ({ date }) => `சேர்க்கப்பட்டது ${date}`,
      projectEntriesChip: ({ count }) => `${count} பதிவுகள்`,
      projectAssignedInvestorsChip: ({ count }) => `${count} ஒதுக்கப்பட்ட முதலீட்டாளர்கள்`,
      projectAssignedSupervisorsChip: ({ count }) => `${count} ஒதுக்கப்பட்ட மேற்பார்வையாளர்கள்`,
      projectPageValue: "தனிப்பட்ட உறுப்பினர்கள் மற்றும் வடிகட்டிகள்",
      alertEnterInvestorName: "தயவுசெய்து முதலீட்டாளர் பெயரை உள்ளிடவும்.",
      alertInvestorExists: "அந்த முதலீட்டாளர் ஏற்கனவே உள்ளார்."
    },
    projectsPage: {
      title: "ஸ்டீல் ஆர்ட்ஸ் திட்டங்கள்",
      heroTitle: "திட்ட மையம்",
      heroDescription:
        "அனைத்து திட்டங்களையும் ஒரே இடத்தில் ஒழுங்குபடுத்தி, பின்னர் வேகமான பரிவர்த்தனை பதிவுக்காக அவற்றின் பெயர்களை டாஷ்போர்டில் பயன்படுத்தவும்.",
      createTitle: "திட்டத்தைச் சேர்க்கவும்",
      projectNamePlaceholder: "திட்டத்தின் பெயரை உள்ளிடவும்",
      projectNameAria: "திட்டத்தின் பெயர்",
      createInvestorsTitle: "திட்ட முதலீட்டாளர்கள்",
      createInvestorsDescription: "ஏற்கனவே உள்ள முதலீட்டாளர்களைத் தேர்வுசெய்யவும் அல்லது தேவையான அளவு புதியவர்களைச் சேர்க்கவும்",
      createSupervisorsTitle: "திட்ட மேற்பார்வையாளர்கள்",
      createSupervisorsDescription: "மேற்பார்வையாளர்களும் முதலீட்டாளர்களைப் போலவே செலவுகளையும் பதிவுகளையும் சேர்ப்பார்கள்",
      createHelper:
        "திட்டத்தை உருவாக்கும் போது ஏற்கனவே உள்ள உறுப்பினர்களைத் தேர்வுசெய்யவும் அல்லது புதியவர்களைச் சேர்க்கவும்; அதன் பக்கம் உடனே தயாராகும்.",
      statProjectCaption: "தற்போது கண்காணிக்கப்படுகிறது",
      statEntryCaption: "அனைத்து திட்டங்களிலும்",
      statSpendCaption: "அனைத்து பதிவுசெய்யப்பட்ட செலவுகள்",
      noExistingInvestors: "இன்னும் ஏற்கனவே உள்ள முதலீட்டாளர்கள் இல்லை. கீழே புதிய முதலீட்டாளர் புலங்களைச் சேர்க்கவும்.",
      noExistingSupervisors: "இன்னும் ஏற்கனவே உள்ள மேற்பார்வையாளர்கள் இல்லை. கீழே புதிய மேற்பார்வையாளர் புலங்களைச் சேர்க்கவும்.",
      createMixHelper:
        "ஏற்கனவே உள்ள உறுப்பினர்களைத் தேர்வுசெய்யவும், புதிய முதலீட்டாளர்களைச் சேர்க்கவும், புதிய மேற்பார்வையாளர்களைச் சேர்க்கவும் அல்லது இரு பங்குகளையும் கலக்கவும்.",
      noProjectsList: "இன்னும் எந்தத் திட்டமும் இல்லை. உங்கள் லெட்ஜரை ஒழுங்குபடுத்த மேலே ஒரு திட்டத்தைச் சேர்க்கவும்.",
      noProjectsDetail: "ஒரு திட்டம் உருவாக்கப்பட்டவுடன் பட்டியலில் இருந்து அதைத் தேர்வுசெய்க.",
      selectProjectDetails: "விவரங்களைப் பார்க்க ஒரு திட்டத்தைத் தேர்வுசெய்க.",
      projectListEntries: ({ count }) => `${count} பதிவுகள்`,
      projectAdded: ({ date }) => `சேர்க்கப்பட்டது ${date}`,
      projectChipEntries: ({ count }) => `${count} பதிவுகள்`,
      projectChipInvestors: ({ count }) => `${count} முதலீட்டாளர்கள்`,
      projectChipSupervisors: ({ count }) => `${count} மேற்பார்வையாளர்கள்`,
      projectChipSpend: ({ amount }) => `${amount} மொத்த செலவு`,
      entriesForProject: ({ projectName }) => `${projectName}க்கான பதிவுகள்`,
      noProjectExpenses: ({ projectName }) => `${projectName}க்காக இன்னும் எந்தச் செலவும் பதிவு செய்யப்படவில்லை.`,
      dynamicFieldPlaceholder: ({ memberType }) => `${memberType} பெயரை உள்ளிடவும்`,
      dynamicFieldAria: ({ memberType }) => `புதிய ${memberType} பெயர்`,
      alertEnterProjectName: "தயவுசெய்து திட்டத்தின் பெயரை உள்ளிடவும்.",
      alertProjectExists: "அந்தத் திட்டம் ஏற்கனவே உள்ளது.",
      alertNeedOneMember: "புதிய திட்டத்திற்காக குறைந்தது ஒரு முதலீட்டாளர் அல்லது மேற்பார்வையாளரைச் சேர்க்கவும்.",
      deleteProjectConfirm: ({ projectName }) => `"${projectName}" ஐ நீக்கவா?`,
      deleteProjectConfirmWithEntries: ({ projectName, count, total }) =>
        `"${projectName}" ஐ நீக்கவா? இதனால் ${count} செலவுப் பதிவுகளும் ${total} மதிப்புள்ள தரவும் நீக்கப்படும்.`
    },
    projectPage: {
      title: "ஸ்டீல் ஆர்ட்ஸ் திட்டம்",
      heroTitle: "திட்டப் பக்கம்",
      heroSubtitle:
        "இந்தப் பக்கம் ஒரே ஒரு திட்டத்திற்காக மட்டுமே ஒதுக்கப்பட்டுள்ளது; அதில் அதன் முதலீட்டாளர்கள், மேற்பார்வையாளர்கள், வடிகட்டிகள், பதிவு படிவம் மற்றும் லெட்ஜர் உள்ளன.",
      investorCaption: "இங்கே ஒதுக்கப்பட்டவர்கள் அல்லது முன்பு பயன்படுத்தப்பட்டவர்கள்",
      supervisorCaption: "இந்தத் திட்டத்திற்கே மட்டும் கண்காணிக்கப்படுகிறது",
      entryCaption: "இந்தப் பக்கத்திலேயே பதிவு செய்யப்படுகிறது",
      spendCaption: "இந்தத் திட்டத்திற்கான அனைத்து செலவுகளும்",
      investorStandings: "முதலீட்டாளர் நிலைகள்",
      supervisorStandings: "மேற்பார்வையாளர் நிலைகள்",
      paidToPlaceholder: "விற்பனையாளர் அல்லது நபரின் பெயர்",
      amountPlaceholder: "0.00",
      teamNote:
        "பிறகு மேலும் முதலீட்டாளர்கள் அல்லது மேற்பார்வையாளர்கள் தேவைப்படுகிறதா? அவர்களை இங்கே சேர்த்தால் இந்தத் திட்டத்தில் உடனே கிடைக்கும்.",
      newMemberPlaceholder: "புதிய உறுப்பினர் பெயரை தட்டச்சு செய்யவும்",
      projectNotFound: "திட்டம் கிடைக்கவில்லை",
      projectNotFoundSubtitle:
        "இந்தத் திட்டப் பக்கத்தை ஏற்ற முடியவில்லை. டாஷ்போர்டு அல்லது Projects பக்கத்திலிருந்து ஒரு திட்டத்தைத் தேர்வுசெய்க.",
      projectNotFoundBody:
        'பொருந்தும் திட்டம் எதுவும் கிடைக்கவில்லை. <a class="text-link" href="index.html">Dashboard</a> க்கு திரும்பவும் அல்லது <a class="text-link" href="projects.html">Projects</a> திறக்கவும்.',
      heroSubtitleForProject: ({ projectName }) =>
        `இங்கே ${projectName} தொடர்பான தரவுகள் மட்டுமே காட்டப்படும்; அதன் முதலீட்டாளர்கள், மேற்பார்வையாளர்கள், வடிகட்டிகள், பதிவு படிவம் மற்றும் லெட்ஜர் உட்பட.`,
      transactionsTitle: ({ projectName }) => `${projectName} பரிவர்த்தனைகள்`,
      noAssignedMembers: ({ memberType }) => `இந்தத் திட்டத்திற்கு இன்னும் எந்த ${memberType}மும் ஒதுக்கப்படவில்லை.`,
      helperAddMemberFirst: ({ projectName }) =>
        `${projectName}ல் செலவுகளை பதிவு செய்வதற்கு முன் குறைந்தது ஒரு முதலீட்டாளர் அல்லது மேற்பார்வையாளரைச் சேர்க்கவும்.`,
      helperNoAssignedRole: ({ memberType }) =>
        `ஒதுக்கப்பட்ட ${memberType}கள் இன்னும் பதிவுக்கு தயாராக இல்லை.`,
      helperOnlyAssigned: ({ memberType, projectName }) =>
        `${projectName}க்காக ஒதுக்கப்பட்ட ${memberType}களை மட்டுமே இங்கே பயன்படுத்தலாம்.`,
      memberManagerHelperChoose: ({ memberType }) =>
        `ஏற்கனவே உள்ள ${memberType}யைத் தேர்வுசெய்யவும் அல்லது புதிய பெயரைத் தட்டச்சு செய்யவும்; பின்னர் மேலும் உறுப்பினர்களைச் சேர்க்கலாம்.`,
      memberManagerHelperNone: ({ memberType }) =>
        `உலகளாவிய பட்டியலில் கூடுதல் ${memberType}கள் இப்போது இல்லை. புதிய பெயரைத் தட்டச்சு செய்து சேர்க்கவும்.`,
      noExpensesMatch: ({ projectName }) => `${projectName}க்கான தற்போதைய பார்வைக்கு பொருந்தும் செலவுகள் எதுவும் இல்லை.`,
      alertFillTransactionFields: "தயவுசெய்து அனைத்து பரிவர்த்தனை புலங்களையும் நிரப்பவும்.",
      alertChooseAssignedMember: ({ memberType }) =>
        `இந்தத் திட்டத்துக்கு ஒதுக்கப்பட்ட ${memberType}யைத் தேர்வுசெய்க.`,
      alertChooseRoleFirst: "முதலில் ஒரு பங்கையைத் தேர்வுசெய்க.",
      alertChooseExistingOrNewNotBoth: ({ memberType }) =>
        `ஏற்கனவே உள்ள ${memberType}யைத் தேர்வுசெய்யவும் அல்லது புதிய ${memberType}யை உள்ளிடவும்; இரண்டையும் ஒன்றாக வேண்டாம்.`,
      alertChooseExistingOrNew: ({ memberType }) =>
        `ஏற்கனவே உள்ள ${memberType}யைத் தேர்வுசெய்யவும் அல்லது புதிய ${memberType} பெயரை உள்ளிடவும்.`,
      alertAlreadyAssigned: ({ memberType }) =>
        `அந்த ${memberType} ஏற்கனவே இந்தத் திட்டத்திற்கு ஒதுக்கப்பட்டுள்ளது.`
    }
  },
  te: {
    common: {
      appName: "స్టీల్ ఆర్ట్స్ లెడ్జర్",
      navPrimary: "ప్రధాన నావిగేషన్",
      dashboard: "డాష్‌బోర్డ్",
      projects: "ప్రాజెక్టులు",
      project: "ప్రాజెక్ట్",
      projectPage: "ప్రాజెక్ట్ పేజీ",
      projectList: "ప్రాజెక్ట్ జాబితా",
      overview: "సారాంశం",
      projectOverview: "ప్రాజెక్ట్ సారాంశం",
      projectInvestors: "ప్రాజెక్ట్ పెట్టుబడిదారులు",
      projectSupervisors: "ప్రాజెక్ట్ పర్యవేక్షకులు",
      projectEntries: "ప్రాజెక్ట్ ఎంట్రీలు",
      overallExpenses: "మొత్తం ఖర్చులు",
      projectSpend: "ప్రాజెక్ట్ ఖర్చు",
      funding: "నిధులు",
      directory: "డైరెక్టరీ",
      create: "సృష్టించు",
      portfolio: "పోర్ట్‌ఫోలియో",
      projectFlow: "ప్రాజెక్ట్ ప్రవాహం",
      oneProjectAtATime: "ఒకేసారి ఒక ప్రాజెక్ట్",
      quickView: "త్వరిత వీక్షణ",
      filters: "ఫిల్టర్‌లు",
      dailyEntry: "దైనందిన ఎంట్రీ",
      projectTeam: "ప్రాజెక్ట్ బృందం",
      investorView: "పెట్టుబడిదారుల వీక్షణ",
      supervisorView: "పర్యవేక్షకుల వీక్షణ",
      selectedProject: "ఎంచుకున్న ప్రాజెక్ట్",
      projectActivity: "ప్రాజెక్ట్ కార్యకలాపం",
      projectLedger: "ప్రాజెక్ట్ లెడ్జర్",
      role: "పాత్ర",
      name: "పేరు",
      paidTo: "ఎవరికి చెల్లించారు",
      amount: "మొత్తం",
      date: "తేదీ",
      totalExpenses: "మొత్తం ఖర్చులు",
      existingProject: "ఇప్పటికే ఉన్న ప్రాజెక్ట్",
      investors: "పెట్టుబడిదారులు",
      supervisors: "పర్యవేక్షకులు",
      investor: "పెట్టుబడిదారు",
      supervisor: "పర్యవేక్షకుడు",
      member: "సభ్యుడు",
      members: "సభ్యులు",
      entries: "ఎంట్రీలు",
      expenseEntries: "ఖర్చు ఎంట్రీలు",
      transactions: "లావాదేవీలు",
      totalInvested: "మొత్తం పెట్టుబడి",
      totalSpent: "మొత్తం ఖర్చు",
      addInvestor: "పెట్టుబడిదారిని జోడించండి",
      addProject: "ప్రాజెక్ట్‌ను జోడించండి",
      addTransaction: "లావాదేవీని జోడించండి",
      addMoreMembers: "ఇంకా సభ్యులను జోడించండి",
      addToProject: "ప్రాజెక్ట్‌కి జోడించండి",
      addNewInvestor: "+ కొత్త పెట్టుబడిదారిని జోడించండి",
      addNewSupervisor: "+ కొత్త పర్యవేక్షకుడిని జోడించండి",
      remove: "తొలగించు",
      saveTransaction: "లావాదేవీని సేవ్ చేయండి",
      openProjectPage: "ప్రాజెక్ట్ పేజీని తెరవండి",
      manageProjects: "ప్రాజెక్టులను నిర్వహించండి",
      manageThisProject: "ఈ ప్రాజెక్ట్‌ను నిర్వహించండి",
      deleteProject: "ప్రాజెక్ట్‌ను తొలగించండి",
      assigned: "కేటాయించబడింది",
      historical: "గత రికార్డు",
      status: "స్థితి",
      visibleOnDashboard: "డాష్‌బోర్డ్‌లో కనిపిస్తుంది",
      asOwnProjectPage: "దాని స్వంత ప్రాజెక్ట్ పేజీగా",
      active: "సక్రియం",
      ready: "సిద్ధం",
      chooseRole: "పాత్రను ఎంచుకోండి",
      chooseMember: "సభ్యుడిని ఎంచుకోండి",
      chooseExistingMember: "ఉన్న సభ్యుడిని ఎంచుకోండి",
      chooseExistingInvestor: "ఉన్న పెట్టుబడిదారిని ఎంచుకోండి",
      chooseExistingSupervisor: "ఉన్న పర్యవేక్షకుడిని ఎంచుకోండి",
      allRoles: "అన్ని పాత్రలు",
      allNames: "అన్ని పేర్లు",
      allPaidTo: "అన్ని చెల్లింపు గ్రహీతలు",
      existingName: "ఇప్పటికే ఉన్న పేరు",
      newName: "కొత్త పేరు",
      language: "భాష",
      languageEnglish: "ఇంగ్లీష్",
      languageHindi: "హిందీ",
      languageKannada: "కన్నడ",
      languageTamil: "తమిళం",
      languageTelugu: "తెలుగు"
    },
    dashboard: {
      title: "స్టీల్ ఆర్ట్స్ డాష్‌బోర్డ్",
      heroTitle: "ఖర్చుల డాష్‌బోర్డ్",
      heroDescription:
        "ఒకేసారి ఒక ప్రాజెక్ట్‌ను తెరవండి. ఇప్పుడు ప్రతి ప్రాజెక్ట్‌కి దాని స్వంత పేజీ ఉంది; అందులో పెట్టుబడిదారులు, పర్యవేక్షకులు, ఫిల్టర్‌లు, ఎంట్రీ ఫారం, లావాదేవీ లెడ్జర్ ఉంటాయి.",
      investorCaption: "ప్రాజెక్ట్‌లకు కేటాయించడానికి అందుబాటులో ఉంది",
      projectCaption: "ప్రతి ఒక్కటి తన స్వంత పేజీలో తెరుచుకుంటుంది",
      expenseCaption: "అన్ని ప్రాజెక్ట్ పేజీలలో",
      investorTitle: "పెట్టుబడిదారులు",
      investorInputPlaceholder: "పెట్టుబడిదారి పేరును జోడించండి",
      investorInputAria: "పెట్టుబడిదారి పేరు",
      projectPagesTitle: "ప్రాజెక్ట్ పేజీలు",
      chooseProjectNote:
        "కింద నుండి ఒక ప్రాజెక్ట్‌ని ఎంచుకుని దాని ప్రత్యేక పేజీని తెరవండి. ఆ పేజీలో ఆ ప్రాజెక్ట్‌కు కేటాయించిన పెట్టుబడిదారులు, పర్యవేక్షకులు, ఎంట్రీలు, మొత్తాలే కనిపిస్తాయి.",
      separateProjectPages: "వేరు ప్రాజెక్ట్ పేజీలు",
      ownMembers: "స్వంత సభ్యులు",
      ownFilters: "స్వంత ఫిల్టర్‌లు",
      emptyInvestors: "ఖర్చులను కేటాయించడం ప్రారంభించడానికి మీ మొదటి పెట్టుబడిదారిని జోడించండి.",
      emptyProjects: "ఇంకా ఏ ప్రాజెక్ట్ లేదు. ప్రత్యేక ప్రాజెక్ట్ లెడ్జర్ సృష్టించడానికి Projects పేజీలో ఒక ప్రాజెక్ట్‌ను జోడించండి.",
      projectAdded: ({ date }) => `జోడించిన తేదీ ${date}`,
      projectEntriesChip: ({ count }) => `${count} ఎంట్రీలు`,
      projectAssignedInvestorsChip: ({ count }) => `${count} కేటాయించిన పెట్టుబడిదారులు`,
      projectAssignedSupervisorsChip: ({ count }) => `${count} కేటాయించిన పర్యవేక్షకులు`,
      projectPageValue: "స్వంత సభ్యులు మరియు ఫిల్టర్‌లు",
      alertEnterInvestorName: "దయచేసి పెట్టుబడిదారి పేరును నమోదు చేయండి.",
      alertInvestorExists: "ఆ పెట్టుబడిదారు ఇప్పటికే ఉన్నారు."
    },
    projectsPage: {
      title: "స్టీల్ ఆర్ట్స్ ప్రాజెక్టులు",
      heroTitle: "ప్రాజెక్ట్ హబ్",
      heroDescription:
        "అన్ని ప్రాజెక్ట్‌లను ఒకేచోట సవ్యంగా అమర్చండి, తర్వాత వేగవంతమైన లావాదేవీ ఎంట్రీ కోసం వాటి పేర్లను డాష్‌బోర్డ్‌లో ఉపయోగించండి.",
      createTitle: "ప్రాజెక్ట్‌ను జోడించండి",
      projectNamePlaceholder: "ప్రాజెక్ట్ పేరును నమోదు చేయండి",
      projectNameAria: "ప్రాజెక్ట్ పేరు",
      createInvestorsTitle: "ప్రాజెక్ట్ పెట్టుబడిదారులు",
      createInvestorsDescription: "ఉన్న పెట్టుబడిదారులను ఎంచుకోండి లేదా అవసరమైనన్ని కొత్తవారిని జోడించండి",
      createSupervisorsTitle: "ప్రాజెక్ట్ పర్యవేక్షకులు",
      createSupervisorsDescription: "పర్యవేక్షకులు కూడా పెట్టుబడిదారుల్లాగే ఖర్చులు మరియు ఎంట్రీలను నమోదు చేస్తారు",
      createHelper:
        "ప్రాజెక్ట్ సృష్టించే సమయంలో ఉన్న సభ్యులను ఎంచుకోండి లేదా కొత్తవారిని జోడించండి, తద్వారా దాని పేజీ వెంటనే సిద్ధమవుతుంది.",
      statProjectCaption: "ప్రస్తుతం ట్రాక్ అవుతోంది",
      statEntryCaption: "అన్ని ప్రాజెక్ట్‌లలో",
      statSpendCaption: "అన్ని నమోదైన ఖర్చులు",
      noExistingInvestors: "ఇంకా ఉన్న పెట్టుబడిదారులు లేరు. కింద కొత్త పెట్టుబడిదారుల ఫీల్డ్‌లను జోడించండి.",
      noExistingSupervisors: "ఇంకా ఉన్న పర్యవేక్షకులు లేరు. కింద కొత్త పర్యవేక్షకుల ఫీల్డ్‌లను జోడించండి.",
      createMixHelper:
        "ఉన్న సభ్యులను ఎంచుకోండి, కొత్త పెట్టుబడిదారులను జోడించండి, కొత్త పర్యవేక్షకులను జోడించండి లేదా రెండు పాత్రల మిశ్రమాన్ని ఉపయోగించండి.",
      noProjectsList: "ఇంకా ఏ ప్రాజెక్ట్ లేదు. మీ లెడ్జర్‌ను అమర్చడం ప్రారంభించేందుకు పైభాగంలో ఒక ప్రాజెక్ట్ జోడించండి.",
      noProjectsDetail: "ఒక ప్రాజెక్ట్ సృష్టించిన తర్వాత జాబితా నుండి దాన్ని ఎంచుకోండి.",
      selectProjectDetails: "వివరాలు చూడటానికి ఒక ప్రాజెక్ట్‌ను ఎంచుకోండి.",
      projectListEntries: ({ count }) => `${count} ఎంట్రీలు`,
      projectAdded: ({ date }) => `జోడించిన తేదీ ${date}`,
      projectChipEntries: ({ count }) => `${count} ఎంట్రీలు`,
      projectChipInvestors: ({ count }) => `${count} పెట్టుబడిదారులు`,
      projectChipSupervisors: ({ count }) => `${count} పర్యవేక్షకులు`,
      projectChipSpend: ({ amount }) => `${amount} మొత్తం ఖర్చు`,
      entriesForProject: ({ projectName }) => `${projectName} కోసం ఎంట్రీలు`,
      noProjectExpenses: ({ projectName }) => `${projectName} కోసం ఇంకా ఎటువంటి ఖర్చు నమోదు కాలేదు.`,
      dynamicFieldPlaceholder: ({ memberType }) => `${memberType} పేరును నమోదు చేయండి`,
      dynamicFieldAria: ({ memberType }) => `కొత్త ${memberType} పేరు`,
      alertEnterProjectName: "దయచేసి ప్రాజెక్ట్ పేరును నమోదు చేయండి.",
      alertProjectExists: "ఆ ప్రాజెక్ట్ ఇప్పటికే ఉంది.",
      alertNeedOneMember: "కొత్త ప్రాజెక్ట్ కోసం కనీసం ఒక పెట్టుబడిదారు లేదా పర్యవేక్షకుడిని జోడించండి.",
      deleteProjectConfirm: ({ projectName }) => `"${projectName}"ను తొలగించాలా?`,
      deleteProjectConfirmWithEntries: ({ projectName, count, total }) =>
        `"${projectName}"ను తొలగించాలా? దీతో పాటు ${count} ఖర్చు ఎంట్రీలు మరియు ${total} విలువ గల రికార్డులు కూడా తొలగించబడతాయి.`
    },
    projectPage: {
      title: "స్టీల్ ఆర్ట్స్ ప్రాజెక్ట్",
      heroTitle: "ప్రాజెక్ట్ పేజీ",
      heroSubtitle:
        "ఈ పేజీ ఒకే ప్రాజెక్ట్‌కే కేటాయించబడింది; ఇందులో దాని పెట్టుబడిదారులు, పర్యవేక్షకులు, ఫిల్టర్‌లు, ఎంట్రీ ఫారం, లెడ్జర్ ఉంటాయి.",
      investorCaption: "ఇక్కడ కేటాయించబడినవారు లేదా గతంలో ఉపయోగించినవారు",
      supervisorCaption: "ఈ ప్రాజెక్ట్‌కే మాత్రమే ట్రాక్ చేయబడింది",
      entryCaption: "ఈ పేజీలోనే నమోదు చేయబడింది",
      spendCaption: "ఈ ప్రాజెక్ట్‌కు సంబంధించిన అన్ని ఖర్చులు",
      investorStandings: "పెట్టుబడిదారుల స్థితి",
      supervisorStandings: "పర్యవేక్షకుల స్థితి",
      paidToPlaceholder: "విక్రేత లేదా వ్యక్తి పేరు",
      amountPlaceholder: "0.00",
      teamNote:
        "తర్వాత మరిన్ని పెట్టుబడిదారులు లేదా పర్యవేక్షకులు కావాలా? వారిని ఇక్కడ జోడిస్తే ఈ ప్రాజెక్ట్‌కు వెంటనే అందుబాటులో ఉంటారు.",
      newMemberPlaceholder: "కొత్త సభ్యుడి పేరును టైప్ చేయండి",
      projectNotFound: "ప్రాజెక్ట్ కనబడలేదు",
      projectNotFoundSubtitle:
        "ఈ ప్రాజెక్ట్ పేజీని లోడ్ చేయలేకపోయాం. డాష్‌బోర్డ్ లేదా Projects పేజీ నుండి ఒక ప్రాజెక్ట్‌ను ఎంచుకోండి.",
      projectNotFoundBody:
        'సరిపోలే ప్రాజెక్ట్ దొరకలేదు. <a class="text-link" href="index.html">Dashboard</a> కి తిరిగి వెళ్లండి లేదా <a class="text-link" href="projects.html">Projects</a> తెరవండి.',
      heroSubtitleForProject: ({ projectName }) =>
        `ఇక్కడ ${projectName} కి సంబంధించిన డేటా మాత్రమే కనిపిస్తుంది; అందులో దాని పెట్టుబడిదారులు, పర్యవేక్షకులు, ఫిల్టర్‌లు, ఎంట్రీ ఫారం, లెడ్జర్ ఉంటాయి.`,
      transactionsTitle: ({ projectName }) => `${projectName} లావాదేవీలు`,
      noAssignedMembers: ({ memberType }) => `ఈ ప్రాజెక్ట్‌కి ఇంకా ఎటువంటి ${memberType} కేటాయించబడలేదు.`,
      helperAddMemberFirst: ({ projectName }) =>
        `${projectName} లో ఖర్చులు నమోదు చేయడానికి ముందు కనీసం ఒక పెట్టుబడిదారు లేదా పర్యవేక్షకుడిని జోడించండి.`,
      helperNoAssignedRole: ({ memberType }) =>
        `కేటాయించిన ${memberType}లు ఇంకా ఎంట్రీకి సిద్ధంగా లేరు.`,
      helperOnlyAssigned: ({ memberType, projectName }) =>
        `${projectName} కోసం కేటాయించిన ${memberType}లను మాత్రమే ఇక్కడ ఉపయోగించవచ్చు.`,
      memberManagerHelperChoose: ({ memberType }) =>
        `ఉన్న ${memberType}ని ఎంచుకోండి లేదా కొత్త పేరును టైప్ చేయండి; తద్వారా తర్వాత మరిన్ని సభ్యులను జోడించవచ్చు.`,
      memberManagerHelperNone: ({ memberType }) =>
        `ప్రపంచ జాబితాలో అదనపు ${memberType}లు ఇంకా లేవు. కొత్త పేరును టైప్ చేసి జోడించండి.`,
      noExpensesMatch: ({ projectName }) => `${projectName} కోసం ప్రస్తుత వీక్షణకు సరిపడే ఖర్చులు లేవు.`,
      alertFillTransactionFields: "దయచేసి అన్ని లావాదేవీ ఫీల్డ్‌లను పూరించండి.",
      alertChooseAssignedMember: ({ memberType }) =>
        `ఈ ప్రాజెక్ట్‌కు కేటాయించిన ${memberType}ని ఎంచుకోండి.`,
      alertChooseRoleFirst: "ముందుగా ఒక పాత్రను ఎంచుకోండి.",
      alertChooseExistingOrNewNotBoth: ({ memberType }) =>
        `ఉన్న ${memberType}ని ఎంచుకోండి లేదా కొత్త ${memberType}ని నమోదు చేయండి; రెండింటినీ ఒకేసారి కాదు.`,
      alertChooseExistingOrNew: ({ memberType }) =>
        `ఉన్న ${memberType}ని ఎంచుకోండి లేదా కొత్త ${memberType} పేరును నమోదు చేయండి.`,
      alertAlreadyAssigned: ({ memberType }) =>
        `ఆ ${memberType} ఇప్పటికే ఈ ప్రాజెక్ట్‌కు కేటాయించబడింది.`
    }
  }
});

let currentLanguage = resolveStoredLanguage();

function resolveStoredLanguage() {
  try {
    const storedLanguage = localStorage.getItem(STORAGE_KEYS.language);
    return SUPPORTED_LANGUAGES[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
}

function getCurrentLanguage() {
  return currentLanguage;
}

function getCurrentLocale() {
  return SUPPORTED_LANGUAGES[currentLanguage]?.locale || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE].locale;
}

function getMemberTypeKey(memberType) {
  return memberType === "Supervisor" ? "common.supervisor" : "common.investor";
}

function getMemberTypeLabel(memberType) {
  return t(getMemberTypeKey(memberType));
}

function getMemberTypeLabelPlural(memberType) {
  return memberType === "Supervisor" ? t("common.supervisors") : t("common.investors");
}

function resolveTranslationValue(language, key) {
  return key.split(".").reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), TRANSLATIONS[language]);
}

function t(key, params = {}) {
  const resolved =
    resolveTranslationValue(currentLanguage, key) ??
    resolveTranslationValue(DEFAULT_LANGUAGE, key);

  if (typeof resolved === "function") {
    return resolved(params);
  }

  return resolved ?? key;
}

function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES[language] || language === currentLanguage) {
    syncLanguageSwitchers();
    return;
  }

  currentLanguage = language;
  localStorage.setItem(STORAGE_KEYS.language, language);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("app-languagechange", {
    detail: {
      language,
      locale: getCurrentLocale()
    }
  }));
}

function syncLanguageSwitchers(root = document) {
  root.querySelectorAll("[data-language-switcher]").forEach(select => {
    select.value = currentLanguage;

    if (select.dataset.languageBound === "true") {
      return;
    }

    select.addEventListener("change", event => {
      setLanguage(event.target.value);
    });
    select.dataset.languageBound = "true";
  });
}

function applyTranslations(root = document) {
  document.documentElement.lang = currentLanguage;
  syncLanguageSwitchers(root);

  root.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  root.querySelectorAll("[data-i18n-title]").forEach(element => {
    element.textContent = t(element.dataset.i18nTitle);
  });

  root.querySelectorAll("[data-i18n-html]").forEach(element => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });
}

function initializeI18n() {
  applyTranslations();
}

function readCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Restore the database-backed workspace after a new login (or after the
// browser cache has been cleared). Pages still keep a local cache for a quick
// first render, but the database is the durable source of project data.
async function hydrateWorkspaceFromDatabase(apiBaseUrl = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "") {
  const [projectsResponse, transactionsResponse] = await Promise.all([
    fetch(apiBaseUrl + "/api/projects", { cache: "no-store" }),
    fetch(apiBaseUrl + "/api/transactions", { cache: "no-store" })
  ]);

  if (!projectsResponse.ok || !transactionsResponse.ok) {
    throw new Error("Could not restore saved workspace data.");
  }

  const [remoteProjects, remoteTransactions] = await Promise.all([
    projectsResponse.json(),
    transactionsResponse.json()
  ]);
  if (!Array.isArray(remoteProjects) || !Array.isArray(remoteTransactions)) {
    throw new Error("The saved workspace data is invalid.");
  }

  const members = remoteProjects.flatMap(project => Array.isArray(project.members) ? project.members : []);
  const uniqueMembers = role => members
    .filter(member => member.role === role)
    .filter((member, index, list) => list.findIndex(item => item.mobile === member.mobile) === index)
    .map(member => ({ id: member.mobile, name: member.name, mobile: member.mobile }));

  writeCollection(STORAGE_KEYS.projects, remoteProjects);
  writeCollection(STORAGE_KEYS.transactions, remoteTransactions);
  writeCollection(STORAGE_KEYS.investors, uniqueMembers("Investor"));
  writeCollection(STORAGE_KEYS.supervisors, uniqueMembers("Supervisor"));

  return { projects: remoteProjects, transactions: remoteTransactions };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(getCurrentLocale());
}

function formatTransactionDate(record) {
  if (record?.createdAt) {
    return formatDateTime(record.createdAt);
  }

  return record?.date ? String(record.date) : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeName(value) {
  return String(value).trim().toLowerCase();
}

function uniqueStrings(values) {
  return [...new Set(
    values
      .map(value => String(value || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function sumTransactions(transactions) {
  return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
}

function getTransactionActorType(tx) {
  return tx.memberType || tx.actorType || (tx.supervisor ? "Supervisor" : "Investor");
}

function getTransactionActorName(tx) {
  return tx.memberName || tx.actorName || tx.investor || "";
}

function buildInvestorTotals(transactions) {
  return transactions.reduce((totals, tx) => {
    if (getTransactionActorType(tx) !== "Investor") {
      return totals;
    }

    const name = getTransactionActorName(tx);
    totals[name] = (totals[name] || 0) + (Number(tx.amount) || 0);
    return totals;
  }, {});
}

function buildInvestorEntryCounts(transactions) {
  return transactions.reduce((counts, tx) => {
    if (getTransactionActorType(tx) !== "Investor") {
      return counts;
    }

    const name = getTransactionActorName(tx);
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});
}

function buildParticipantTotals(transactions, memberType) {
  return transactions.reduce((totals, tx) => {
    if (getTransactionActorType(tx) !== memberType) {
      return totals;
    }

    const name = getTransactionActorName(tx);
    totals[name] = (totals[name] || 0) + (Number(tx.amount) || 0);
    return totals;
  }, {});
}

function buildParticipantEntryCounts(transactions, memberType) {
  return transactions.reduce((counts, tx) => {
    if (getTransactionActorType(tx) !== memberType) {
      return counts;
    }

    const name = getTransactionActorName(tx);
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});
}

function getProjectByName(projects, name) {
  return projects.find(project => project.name === name);
}

function getProjectInvestorNames(project) {
  return uniqueStrings(Array.isArray(project?.investorNames) ? project.investorNames : []);
}

function getProjectSupervisorNames(project) {
  return uniqueStrings(Array.isArray(project?.supervisorNames) ? project.supervisorNames : []);
}

function getProjectTransactions(transactions, projectName) {
  return transactions.filter(tx => tx.project === projectName);
}

function getProjectMemberNames(project, memberType) {
  return memberType === "Supervisor"
    ? getProjectSupervisorNames(project)
    : getProjectInvestorNames(project);
}

function collectHistoricalMemberNames(transactions, projectName, memberType) {
  return uniqueStrings(
    transactions
      .filter(tx => tx.project === projectName && getTransactionActorType(tx) === memberType)
      .map(getTransactionActorName)
  );
}

function prepareProjects(rawProjects, investors, transactions, supervisors = null) {
  const knownInvestorNames = new Set(investors.map(investor => investor.name));
  const knownSupervisorNames = Array.isArray(supervisors)
    ? new Set(supervisors.map(supervisor => supervisor.name))
    : null;
  let changed = false;

  const projects = rawProjects.map(project => {
    const storedInvestorNames = Array.isArray(project.investorNames)
      ? uniqueStrings(project.investorNames.filter(name => knownInvestorNames.has(name)))
      : null;
    const storedSupervisorNames = Array.isArray(project.supervisorNames)
      ? uniqueStrings(
          knownSupervisorNames
            ? project.supervisorNames.filter(name => knownSupervisorNames.has(name))
            : project.supervisorNames
        )
      : null;
    const inferredInvestorNames = uniqueStrings(
      transactions
        .filter(
          tx =>
            tx.project === project.name &&
            getTransactionActorType(tx) === "Investor" &&
            knownInvestorNames.has(getTransactionActorName(tx))
        )
        .map(getTransactionActorName)
    );
    const inferredSupervisorNames = uniqueStrings(
      transactions
        .filter(
          tx =>
            tx.project === project.name &&
            getTransactionActorType(tx) === "Supervisor" &&
            knownSupervisorNames.has(getTransactionActorName(tx))
        )
        .map(getTransactionActorName)
    );
    const investorNames = storedInvestorNames === null
      ? inferredInvestorNames
      : storedInvestorNames;
    const supervisorNames = storedSupervisorNames === null
      ? inferredSupervisorNames
      : storedSupervisorNames;
    const normalizedProject = {
      ...project,
      investorNames,
      supervisorNames
    };

    if (
      storedInvestorNames === null ||
      storedSupervisorNames === null ||
      !arraysEqual(investorNames, getProjectInvestorNames(project)) ||
      !arraysEqual(supervisorNames, getProjectSupervisorNames(project))
    ) {
      changed = true;
    }

    return normalizedProject;
  });

  return { projects, changed };
}

function buildProjectStats(projects, transactions) {
  return projects.map(project => {
    const related = getProjectTransactions(transactions, project.name);
    const assignedInvestors = getProjectInvestorNames(project);
    const assignedSupervisors = getProjectSupervisorNames(project);
    const historicalInvestors = uniqueStrings(
      related
        .filter(tx => getTransactionActorType(tx) === "Investor")
        .map(getTransactionActorName)
    );
    const historicalSupervisors = uniqueStrings(
      related
        .filter(tx => getTransactionActorType(tx) === "Supervisor")
        .map(getTransactionActorName)
    );

    return {
      project,
      entryCount: related.length,
      investorCount: Math.max(assignedInvestors.length, historicalInvestors.length),
      supervisorCount: Math.max(assignedSupervisors.length, historicalSupervisors.length),
      assignedInvestorCount: assignedInvestors.length,
      assignedSupervisorCount: assignedSupervisors.length,
      total: sumTransactions(related)
    };
  });
}

function formatProjectDate(value) {
  if (!value) {
    return t("common.existingProject");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t("common.existingProject");
  }

  return date.toLocaleDateString(getCurrentLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeI18n, { once: true });
} else {
  initializeI18n();
}
