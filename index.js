const {
  input,
  div,
  text,
  script,
  domReady,
  style,
} = require("@saltcorn/markup/tags");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Field = require("@saltcorn/data/models/field");
const { stateFieldsToWhere } = require("@saltcorn/data/plugin-helper");
const Nominatim = require("nominatim-geocoder");
const geocoder = new Nominatim();

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();

          const result_views = await View.find_table_views_where(
            context.table_id,
            ({ viewtemplate, viewrow }) =>
              viewtemplate.renderRows && viewrow.name !== context.viewname
          );
          const result_view_opts = result_views.map((v) => v.name);

          return new Form({
            fields: [
              {
                name: "result_view",
                label: "Result view",
                sublabel: "Blank for no popup",
                type: "String",
                required: true,
                attributes: {
                  options: result_view_opts.join(),
                },
              },
              {
                name: "latitude_field",
                label: "Latitude field",
                type: "String",
                sublabel:
                  "The table need a fields of type 'Float' for latitude.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Float")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "longtitude_field",
                label: "Longtitude field",
                type: "String",
                sublabel:
                  "The table need a fields of type 'Float' for longtitude.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Float")
                    .map((f) => f.name)
                    .join(),
                },
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id) => {
  const table_fields = await Field.find({ table_id });
  return table_fields.map((f) => {
    const sf = new Field(f);
    sf.required = false;
    return sf;
  });
};

const searchForm = () =>
  new Form({
    action: `/view/${viewname}`,
    methodGET: true,
    fields: [{ name: "_locq", label: "Location", input_type: "search" }],
  });

const run = async (
  table_id,
  viewname,
  { result_view, latitude_field, longtitude_field },
  state,
  extraArgs
) => {
  if (!state._locq) {
    return renderForm(searchForm(), req.csrfToken());
  } else {
    const resview = await View.findOne({ name: result_view });
    if (!resview)
      return div(
        { class: "alert alert-danger" },
        "Geosearch incorrectly configured. Cannot find view: ",
        result_view
      );

    const tbl = await Table.findOne({ id: table_id });
    const { _locq, ...state_noloc } = state;
    const qstate = await stateFieldsToWhere({ fields, state_noloc });
    const response = await geocoder.search({ q: _locq });
    if (response.length > 0) {
      const fetchedRows = await tbl.getRows(qstate, {
        orderBy: `(${longtitude_field}, ${latitude_field}) <@> (${response[0].lon}, ${response[0].lat})`,
      });
      const rendered = await resview.viewtemplateObj.renderRows(
        tbl,
        resview.name,
        resview.configuration,
        extraArgs,
        fetchedRows
      );
      return (
        renderForm(searchForm(), req.csrfToken()) +
        div(rendered.map(({ html }) => div(html)))
      );
    } else {
      return renderForm(searchForm(), req.csrfToken()) + div("Not found");
    }
  }
};

module.exports = {
  sc_plugin_api_version: 1,
  viewtemplates: [
    {
      name: "Geosearch",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};