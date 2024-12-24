const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

window.customCards = window.customCards || [];
window.customCards.push({
  type: "grocy-meal-plan-card",
  name: "Meal Plan",
  description: "A card to display your meal plan from Grocy.",
  preview: false,
});

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

class MealPlanCard extends LitElement {
  static get properties() {
    return {
      _config: {},
      hass: {},
    };
  }
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please select the meal plan sensor");
    }
    this._config = config;
  }

  translate(string) {
    if((this._config.custom_translation != null) &&
        (this._config.custom_translation[string] != null))
        {
           return this._config.custom_translation[string];
        }
    return string;
  }  

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    this.numberElements = 0;
    this.recipelength = 300;
    if(this._config.recipeLength != null){
        this.recipelength = this._config.recipeLength;
    }
    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
            <style>
              .not-found {
                flex: 1;
                background-color: yellow;
                padding: 8px;
              }
            </style>
            <ha-card>
              <div class="not-found">
                Entity not available: ${this._config.entity}
              </div>
            </ha-card>
          `;
    }

    return html`
          <ha-card @click="${this._handleClick}">
            ${this.renderPlan(stateObj.attributes.meals)}
          </ha-card>
        `;
  }

  renderPlan(meals) {
    if (!meals || meals.length === 0) {
      return html`
            <ha-card>
              <div class="not-found">
                ${this.translate("No meal plans found")}
              </div>
            </ha-card>            
            `;
    }

    const lang = this.hass.selectedLanguage || this.hass.language;
    const tz = this.hass.config.time_zone || "GMT";

    this.numberElements++;
    
    // Build meal plan array with filtering
    var newplan = this.buildPlan(meals, lang, tz);
    
    // Group recipes by day and then by section
    const groupedByDay = newplan.reduce((acc, recipe) => {
        if (!acc[recipe.day]) acc[recipe.day] = {};
        const sectionName = recipe.section.name;
        if (!acc[recipe.day][sectionName]) acc[recipe.day][sectionName] = [];
        acc[recipe.day][sectionName].push(recipe);
        return acc;
    }, {});
    
    var newDiv = document.createElement('div');
    
    // Generate HTML
    let htmlOutput = "";
    for (const [day, sections] of Object.entries(groupedByDay)) {
        htmlOutput += `<div class="dayGroup">`;
        htmlOutput += `<h2 class="dayTitle">${this.getDay(day, lang, tz)}, ${this.getMonth(day, lang, tz)}. ${this.getDayDate(day, lang, tz)}</h2>`;

        for (const [sectionName, recipes] of Object.entries(sections)) {
            htmlOutput += `<div class="sectionGroup section${sectionName}">`;
            htmlOutput += `<h3 class="sectionTitle">${sectionName}</h3>`;
            recipes.forEach(recipe => {
                htmlOutput += `
                    <div class="meal">
                        <span class="recipeTitle">${recipe.recipe.name}</span>
                    </div>
                `;
            });
            htmlOutput += `</div>`;
        }

        htmlOutput += `</div>`;
    }

    newDiv.innerHTML = htmlOutput;
    
    if (newplan.length > 0) {
      console.log("we have a plan");
      return newDiv;
    }
    else {
      return html`
      <ha-card>
        <div class="not-found">
          No meal plans for today.
        </div>
      </ha-card>            
      `;        
    }
  }

  _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  getCardSize() {
    return 3;
  }

  buildPlan(meals, lang, tz) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = today.getMonth() + 1;
    var dd = today.getDate();
    dd <10 ? dd = '0' + dd : dd = dd
    mm < 10 ? mm = '0' + mm : mm = mm
    today = yyyy + '-' + mm + '-' + dd
    var newplan = [];
    if (this._config.daily)
    {
      meals.forEach(daily => {
        if (daily.day == today) {
          newplan.push(daily)
        }
      })
    } 
    else if (this._config.section) {
      meals.forEach(daily => {
        if (daily.section.name.toLowerCase() == this._config.section.toLowerCase()) {
          newplan.push(daily)
        }
      })
      newplan.splice(this._config.count ? this._config.count : 5)
    }
    else {
      meals.slice(0,this._config.count ? this._config.count : 5).map(daily => newplan.push(daily))
    }

    // Sort the object first by date, then by the section sort_number (so breakfast comes before lunch)
    return newplan.sort((a, b) => {
        // Compare days
        if (a.day < b.day) return -1;
        if (a.day > b.day) return 1;

        // Compare section.sort_number if days are equal
        return a.section.sort_number - b.section.sort_number;
    });
  }

  getDay(theDate, lang, tz) {
    theDate = theDate.split('T')[0] + " 12:00"

    return new Date(theDate).toLocaleString(lang, {
      weekday: "long", timeZone: tz,
    })
  }

  getDayDate(theDate, lang) {
    theDate = theDate.split('T')[0] + " 12:00"

    return new Date(theDate).getDay()
  }

  getMonth(theDate, lang, tz) {
    theDate = theDate.split('T')[0] + " 12:00"

    return new Date(theDate).toLocaleString(lang, {
      month: "short", timeZone: tz,
    })
  }

  static get styles() {
    return css`
          ha-card {
            padding: 1em;
          }
    
          .sectionGroup {
            
          }

          .sectionBreakfast, .sectionLunch, .sectionDinner, .sectionSnack {
            .sectionTitle:before {
              content: "•";
              font-size: 200%
              background-color: var(--purple-color);
              color: var(--purple-color);
              margin-right: 0.1em;
              padding: 0.5em;
              border-radius: 100%;
            }
          }

          .sectionLunch {
            h3:before {
              color: var(--amber-color);
              background-color: var(--amber-color);
            }
          }

          .sectionDinner {
            h3:before {
              color: var(--teal-color);
              background-color: var(--teal-color);
            }
          }

          .sectionSnack {
            h3:before {
              color: var(--lime-color);
              background-color: var(--lime-color);
            }
          }

          .day {
            width: 100%;
            margin: auto;
            overflow: hidden;
          }

          .view {
            overflow: visible;
            width: 55%;
            margin-top: 1%;
            margin-left: 2.5%;
            alignment-baseline: text-after-edge;              
          }

          .svg_view {
            overflow: visible;
            width: 55%;
            margin-top: 1%;
            margin-left: 2.5%;
            alignment-baseline: text-after-edge;
          }
          
          .dayGroup {
            padding-bottom: 0.5em;
            border-bottom: 1px solid var(--divider-color);
            margin-bottom: 0.5em;
          }

          .dayGroup:last-of-type {
            padding: 0;
            margin: 0:
            border-width: 0;
          }
          
          .dayTitle {
            font-weight: normal;
            color: var(--ha-card-header-color, --primary-text-color);
            font-family: var(--ha-card-header-font-family, inherit);
            font-size: var(--ha-card-header-font-size, 24px);            
          }

          .sectionTitle {
            font-weight: normal;
            text-transform: uppercase;
          }

          .recipeTitle {
            font-weight: normal;
            opacity: 0.8;
          }

          .meal { 
            display: inline;
            margin-left: 1em;
          }
          
          .recipe_name {
            font-size: 14px;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
            fill: #fff;              
          }

          .section {
            font-size: 14px;
            font-style: italic;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
            fill: #fff;              
          } 
          
          .pic {
                width: 10em;
                float: right;
                display: inline-block;
                border-radius: var(--ha-card-border-radius,6px);
          }
          .dayname {
            text-transform: uppercase;
          }
        `;
  }
}
customElements.define("grocy-meal-plan-card", MealPlanCard);
