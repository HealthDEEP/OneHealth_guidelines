/* =========================================================
   ONE HEALTH GUIDELINES DATABASE
   app.js
   ========================================================= */

let records = [];


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function escapeHtml(value) {

  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttr(value) {
  return escapeHtml(value);
}


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const els = {

  databaseStatus: $("databaseStatus"),

  search: $("searchInput"),
  clearSearch: $("clearSearch"),

  type: $("typeFilter"),
  organization: $("organizationFilter"),
  country: $("countryFilter"),
  topic: $("topicFilter"),
  year: $("yearFilter"),

  sort: $("sortFilter"),

  reset: $("resetFilters"),
  noResultsReset: $("noResultsReset"),

  results: $("results"),
  noResults: $("noResults"),
  resultCount: $("resultsCount"),

  statTotal: $("statTotal"),
  statOrganizations: $("statOrganizations"),
  statCountries: $("statCountries"),
  statTopics: $("statTopics"),
  statYears: $("statYears"),

  modal: $("detailModal"),
  modalOverlay: $("modalOverlay"),
  modalBody: $("modalBody"),
  closeModal: $("closeModal")
};


/* =========================================================
   LOAD DATABASE
   ========================================================= */

async function loadData() {

  try {

    if (els.databaseStatus) {
      els.databaseStatus.textContent = "Loading database…";
    }

    const response = await fetch("data.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load data.json: HTTP ${response.status}`
      );
    }

    records = await response.json();

    if (!Array.isArray(records)) {
      throw new Error("data.json does not contain an array.");
    }

    initialise();

    if (els.databaseStatus) {
      els.databaseStatus.textContent =
        `${records.length} resources`;
    }

  } catch (error) {

    console.error("Database loading error:", error);

    if (els.databaseStatus) {
      els.databaseStatus.textContent =
        "Error loading database";
    }

    if (els.results) {
      els.results.innerHTML = `
        <div class="error-message">
          <strong>Unable to load the database.</strong>
          <p>
            Please check that <code>data.json</code>
            is present in the same folder as
            <code>index.html</code> and <code>app.js</code>.
          </p>
          <p>
            ${escapeHtml(error.message)}
          </p>
        </div>
      `;
    }
  }
}


/* =========================================================
   INITIALISE
   ========================================================= */

function initialise() {

  populateFilters();

  updateStats();

  applyFilters();

  bindEvents();
  
}


/* =========================================================
   FILTER POPULATION
   ========================================================= */

function populateFilters() {

  const types = new Set();
  const organizations = new Set();
  const countries = new Set();
  const topics = new Set();
  const years = new Set();


  records.forEach(record => {

    if (record.type) {
      types.add(record.type);
    }

    if (record.organization) {
      organizations.add(record.organization);
    }

    if (record.year) {
      years.add(record.year);
    }


    /* Countries */

    if (Array.isArray(record.countries)) {

      record.countries.forEach(country => {

        if (country) {
          countries.add(country);
        }

      });

    } else if (record.countries) {

      countries.add(record.countries);

    }


    /* Topics */

    if (Array.isArray(record.topics)) {

      record.topics.forEach(topic => {

        if (topic) {
          topics.add(topic);
        }

      });

    } else if (record.topics) {

      topics.add(record.topics);

    }

  });


  fillSelect(
    els.type,
    [...types].sort()
  );

  fillSelect(
    els.organization,
    [...organizations].sort()
  );

  fillSelect(
    els.country,
    [...countries].sort()
  );

  fillSelect(
    els.topic,
    [...topics].sort()
  );

  fillSelect(
    els.year,
    [...years]
      .sort((a, b) => Number(b) - Number(a))
  );
}


/* =========================================================
   SELECT HELPER
   ========================================================= */

function fillSelect(select, values) {

  if (!select) {
    return;
  }

  values.forEach(value => {

    const option = document.createElement("option");

    option.value = value;
    option.textContent = value;

    select.appendChild(option);

  });
}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStats() {

  if (els.statTotal) {
    els.statTotal.textContent = records.length;
  }


  if (els.statOrganizations) {

    const organizations =
      new Set(
        records
          .map(record => record.organization)
          .filter(Boolean)
      );

    els.statOrganizations.textContent =
      organizations.size;
  }


  if (els.statCountries) {

    const countries = new Set();

    records.forEach(record => {

      if (Array.isArray(record.countries)) {

        record.countries.forEach(country => {

          if (country) {
            countries.add(country);
          }

        });

      } else if (record.countries) {

        countries.add(record.countries);

      }

    });

    els.statCountries.textContent =
      countries.size;
  }


  if (els.statTopics) {

    const topics = new Set();

    records.forEach(record => {

      if (Array.isArray(record.topics)) {

        record.topics.forEach(topic => {

          if (topic) {
            topics.add(topic);
          }

        });

      } else if (record.topics) {

        topics.add(record.topics);

      }

    });

    els.statTopics.textContent =
      topics.size;
  }


  if (els.statYears) {

    const years =
      new Set(
        records
          .map(record => record.year)
          .filter(Boolean)
      );

    els.statYears.textContent =
      years.size;
  }
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyFilters() {

  const q =
    els.search.value
      .trim()
      .toLowerCase();

  const type =
    els.type.value;

  const organization =
    els.organization.value;

  const country =
    els.country.value;

  const topic =
    els.topic.value;

  const year =
    els.year.value;


  let filtered = records.filter(record => {


    /* -----------------------------------------------------
       SEARCH
       Scope is searchable but NOT a filter
       ----------------------------------------------------- */

    const haystack = [

      record.id,
      record.title,
      record.short_title,
      record.type,
      record.organization,

      /* Scope remains searchable */
      record.scope,

      record.status,
      record.description,
      record.relevance,
      record.source,

      ...(Array.isArray(record.countries)
        ? record.countries
        : [record.countries]),

      ...(Array.isArray(record.topics)
        ? record.topics
        : [record.topics])

    ]
      .filter(
        value =>
          value !== undefined &&
          value !== null
      )
      .join(" ")
      .toLowerCase();


    const matchesSearch =
      !q || haystack.includes(q);


    /* -----------------------------------------------------
       TYPE
       ----------------------------------------------------- */

    const matchesType =
      !type ||
      record.type === type;


    /* -----------------------------------------------------
       ORGANIZATION
       ----------------------------------------------------- */

    const matchesOrganization =
      !organization ||
      record.organization === organization;


    /* -----------------------------------------------------
       COUNTRY
       ----------------------------------------------------- */

    const recordCountries =
      Array.isArray(record.countries)
        ? record.countries
        : [record.countries];

    const matchesCountry =
      !country ||
      recordCountries.includes(country);


    /* -----------------------------------------------------
       TOPIC
       ----------------------------------------------------- */

    const recordTopics =
      Array.isArray(record.topics)
        ? record.topics
        : [record.topics];

    const matchesTopic =
      !topic ||
      recordTopics.includes(topic);


    /* -----------------------------------------------------
       YEAR
       ----------------------------------------------------- */

    const matchesYear =
      !year ||
      String(record.year) === String(year);


    return (
      matchesSearch &&
      matchesType &&
      matchesOrganization &&
      matchesCountry &&
      matchesTopic &&
      matchesYear
    );

  });


  /* =======================================================
     SORT
     ======================================================= */

  filtered.sort((a, b) => {

    switch (els.sort.value) {

      case "year_asc":

        return (
          Number(a.year || 0) -
          Number(b.year || 0)
        );


      case "title_asc":

        return String(a.title || "")
          .localeCompare(
            String(b.title || "")
          );


      case "organization_asc":

        return String(a.organization || "")
          .localeCompare(
            String(b.organization || "")
          );


      default:

        return (
          Number(b.year || 0) -
          Number(a.year || 0)
        );
    }

  });


  /* =======================================================
     DISPLAY RESULT COUNT
     ======================================================= */

  if (els.resultCount) {

    els.resultCount.textContent =
      `${filtered.length} resource${
        filtered.length === 1
          ? ""
          : "s"
      }`;

  }


  /* =======================================================
     RENDER
     ======================================================= */

  renderCards(filtered);
}


/* =========================================================
   RENDER CARDS
   ========================================================= */

function renderCards(filtered) {

  if (!els.results || !els.noResults) {
    return;
  }


  els.results.innerHTML = "";


  if (filtered.length === 0) {

    els.noResults.style.display = "block";

    return;
  }


  els.noResults.style.display = "none";


  filtered.forEach(record => {

    const card =
      document.createElement("article");

    card.className = "resource-card";


    const countries =
      Array.isArray(record.countries)
        ? record.countries.join(", ")
        : record.countries || "";


    const topics =
      Array.isArray(record.topics)
        ? record.topics
        : record.topics
          ? [record.topics]
          : [];


    const topicHtml =
      topics
        .map(topic =>
          `<span class="tag">
             ${escapeHtml(topic)}
           </span>`
        )
        .join("");


    card.innerHTML = `

      <div class="card-header">

        <span class="resource-type">
          ${escapeHtml(record.type || "")}
        </span>

        ${
          record.year
            ? `<span class="resource-year">
                 ${escapeHtml(record.year)}
               </span>`
            : ""
        }

      </div>


      <h3>
        ${escapeHtml(record.title || "")}
      </h3>


      ${
        record.short_title
          ? `<div class="short-title">
               ${escapeHtml(record.short_title)}
             </div>`
          : ""
      }


      ${
        record.organization
          ? `<div class="organization">
               ${escapeHtml(record.organization)}
             </div>`
          : ""
      }


      ${
        countries
          ? `<div class="countries">
               ${escapeHtml(countries)}
             </div>`
          : ""
      }


      ${
        topicHtml
          ? `<div class="topics">
               ${topicHtml}
             </div>`
          : ""
      }


      <button
        class="details-button"
        type="button"
        data-id="${escapeAttr(record.id)}"
      >
        View details
      </button>

    `;


    const button =
      card.querySelector(".details-button");


    button.addEventListener(
      "click",
      () => openModal(record.id)
    );


    els.results.appendChild(card);

  });
}


/* =========================================================
   MODAL
   ========================================================= */
function openModal(id) {

  const record =
    records.find(
      item => String(item.id) === String(id)
    );

  if (!record) {
    console.error("Record not found:", id);
    return;
  }


  const countries =
    Array.isArray(record.countries)
      ? record.countries.join(", ")
      : record.countries || "";


  const topics =
    Array.isArray(record.topics)
      ? record.topics
      : record.topics
        ? [record.topics]
        : [];


  const topicsHtml =
    topics
      .map(topic =>
        `<span class="tag">
          ${escapeHtml(topic)}
        </span>`
      )
      .join("");


  els.modalBody.innerHTML = `

    <div class="modal-resource">

      <div class="modal-type">
        ${escapeHtml(record.type || "")}
      </div>


      <h2 id="modalTitle">
        ${escapeHtml(record.title || "")}
      </h2>


      ${
        record.short_title
          ? `<p class="short-title">
               ${escapeHtml(record.short_title)}
             </p>`
          : ""
      }


      <dl class="details-list">


        ${
          record.year
            ? `
              <div>
                <dt>Year</dt>
                <dd>
                  ${escapeHtml(record.year)}
                </dd>
              </div>
            `
            : ""
        }


        ${
          record.organization
            ? `
              <div>
                <dt>Organization</dt>
                <dd>
                  ${escapeHtml(record.organization)}
                </dd>
              </div>
            `
            : ""
        }


        ${
          record.status
            ? `
              <div>
                <dt>Status</dt>
                <dd>
                  ${escapeHtml(record.status)}
                </dd>
              </div>
            `
            : ""
        }


        ${
          record.scope
            ? `
              <div>
                <dt>Scope</dt>
                <dd>
                  ${escapeHtml(record.scope)}
                </dd>
              </div>
            `
            : ""
        }


        ${
          countries
            ? `
              <div>
                <dt>Countries / areas</dt>
                <dd>
                  ${escapeHtml(countries)}
                </dd>
              </div>
            `
            : ""
        }


        ${
          topicsHtml
            ? `
              <div>
                <dt>Topics</dt>
                <dd class="modal-tags">
                  ${topicsHtml}
                </dd>
              </div>
            `
            : ""
        }


      </dl>


      ${
        record.description
          ? `
            <section class="modal-section">

              <h3>Description</h3>

              <p>
                ${escapeHtml(record.description)}
              </p>

            </section>
          `
          : ""
      }


      ${
        record.relevance
          ? `
            <section class="modal-section">

              <h3>Relevance</h3>

              <p>
                ${escapeHtml(record.relevance)}
              </p>

            </section>
          `
          : ""
      }


      ${
        record.notes
          ? `
            <section class="modal-section">

              <h3>Notes</h3>

              <p>
                ${escapeHtml(record.notes)}
              </p>

            </section>
          `
          : ""
      }


      ${
        record.url
          ? `
            <div class="modal-source">

              <a
                href="${escapeAttr(record.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original resource
              </a>

            </div>
          `
          : ""
      }


    </div>

  `;


  /*
   * IMPORTANT:
   * Remove "hidden" and add "open".
   */

  els.modal.classList.remove("hidden");
  els.modal.classList.add("open");

  document.body.classList.add("modal-open");
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

  if (!els.modal) {
    return;
  }

  els.modal.classList.remove("open");
  els.modal.classList.add("hidden");

  document.body.classList.remove("modal-open");
}

/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  els.search.value = "";

  els.type.value = "";

  els.organization.value = "";

  els.country.value = "";

  els.topic.value = "";

  els.year.value = "";

  els.sort.value = "year_desc";


  applyFilters();
}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindEvents() {


  /* Search */

  if (els.search) {

    els.search.addEventListener(
      "input",
      applyFilters
    );

  }


  /* Clear search */

  if (els.clearSearch) {

    els.clearSearch.addEventListener(
      "click",
      () => {

        els.search.value = "";

        applyFilters();

        els.search.focus();

      }
    );

  }


  /* Filters */

  [
    els.type,
    els.organization,
    els.country,
    els.topic,
    els.year,
    els.sort

  ].forEach(select => {

    if (select) {

      select.addEventListener(
        "change",
        applyFilters
      );

    }

  });


  /* Reset */

  if (els.reset) {

    els.reset.addEventListener(
      "click",
      resetFilters
    );

  }


  /* No-results reset */

  if (els.noResultsReset) {

    els.noResultsReset.addEventListener(
      "click",
      resetFilters
    );

  }


  /* Modal close */

  if (els.closeModal) {

    els.closeModal.addEventListener(
      "click",
      closeModal
    );

  }


  if (els.modalOverlay) {

    els.modalOverlay.addEventListener(
      "click",
      closeModal
    );

  }


  /* Escape key */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key === "Escape") {

        closeModal();

      }

    }
  );

}



/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  loadData
);