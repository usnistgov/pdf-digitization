const specs = {
	asphalt: `Asphalt:{
      "ext_version": "1.0",
      "ext": {
        "us_epa": {
          "ext_version": "",
          "binder_pg_high_suffix": null,
          "binder_pg_low_suffix": null,
          "binder_pg_high":"",
          "binder_pg_low":"",
          "production_temp_high": "",
          "production_temp_low": "",
          "plant_location_type": "",
          "asphalt_specification": "",
          "asphalt_specification_entity": "",
          "customer_project_id": null,
          "ingredients_table": [
            {
              "component": "",
              "material": "",
              "has_data_gap": ,
              "weight_pct": ""
            },
            {
              "component": "",
              "material": "",
              "has_data_gap": false,
              "weight_pct": ""
            },
            {
              "component": "",
              "material": "",
              "has_data_gap": ,
              "weight_pct": ""
            },
            {
              "component": "",
              "material": "",
              "has_data_gap": false,
              "weight_pct": ""
            },
            {
              "component": "",
              "material": "",
              "has_data_gap":false ,
              "weight_pct": ""
            },
            {
              "component": "",
              "material": "",
              "has_data_gap": ,
              "weight_pct": ""
            }
          ]
        }
      },
      "aggregate_size_max": "",
      "max_temperature": "",
      "min_temperature": "",
      "mix_type": "WMA",
      "gradation": "",
      "rap": ,
      "ras": ,
      "sbr": ,
      "sbs": ,
      "ppa": ,
      "gtr": ,
      "pmb": ,
    }`,
	cement: `cementitious: {
      opc: 0.0, //0.123,
      wht: 0.0, //0.123,
      ggbs: 0.0, //0.045,
      flyAsh: 0.0, //0.045,
      siFume: 0.0, //0.045,
      gg45: 0.0, //0.045,
      natPoz: 0.0, //this could also be specified as natural pozzolan(s),
      mk: 0.0, //0.045,
      CaCO3: 0.0, // this could also be specified as limestone
      other: 0.0, //0.045,
    },
    astm_prescriptive: "", //"Type I (C150)",
    astm_performance: Array, //["C1157 GU", "C1157 MH"],
    en197_1_type: "", //"CEM I",
    csa_a3001: Array, //["A3001 HE(L)(b)", "A3001 HS(L)(b)"],
  }`,
	"ready mix concrete": `{
    strength_28d: "",
    slump: "", 
    strength_other: "",
    strength_other_d: 0, 
    w_c_ratio: 0.0, 
    aci_exposure_classes: [""],
    csa_exposure_classes: [""], 
    en_exposure_classes: [""], 
    application: {
      fnd: false,
      sog: false,
      hrz: false,
      vrt_wall: false,
      vrt_column: false,
      vrt_other: false,
      sht: false,
      cdf: false,
      sac: false,
      pav: false,
      oil: false,
      grt: false,
      ota: false,
    },
    options: {
      lightweight: false,
      scc: false,
      finishable: false,
      air: false,
      co2: false,
      white: false,
      plc: false,
      fiber_reinforced: false,
    },
    cementitious: {
      opc: 0.0, 
      wht: 0.0, 
      ggbs: 0.0, 
      flyAsh: 0.0, 
      siFume: 0.0, 
      gg45: 0.0, 
      natPoz: 0.0, 
      mk: 0.0, 
      CaCO3: 0.0, 
      other: 0.0, 
}`,
};

export default specs;

// export const specs = {
//   asphalt: {
//     pc: "asphalt",
//     id: 1,
//   },
//   cement: {
//     cementitious: {
//       opc: 0.00, //0.123,
//       wht: 0.00, //0.123,
//       ggbs: 0.00, //0.045,
//       flyAsh: 0.00, //0.045,
//       siFume: 0.00, //0.045,
//       gg45: 0.00, //0.045,
//       natPoz: 0.00, //0.045,
//       mk: 0.00, //0.045,
//       CaCO3: 0.00, //0.045,
//       other: 0.00, //0.045,
//     },
//     astm_prescriptive: "", //"Type I (C150)",
//     astm_performance: Array, //["C1157 GU", "C1157 MH"],
//     en197_1_type: "", //"CEM I",
//     csa_a3001: Array, //["A3001 HE(L)(b)", "A3001 HS(L)(b)"],
//   },
//   "ready mix concrete": {
//     strength_28d: "", //"2500 psi",
//     slump: "", //"5 in",
//     strength_other: "", //"1500 psi",
//     strength_other_d: 0.00, //3,
//     w_c_ratio: 0.00, //0.52,
//     aci_exposure_classes: Array, //["aci.F2", "aci.S3", "aci.F3"],
//     csa_exposure_classes: Array, //["csa.C-1", "csa.F-1", "csa.S-3"],
//     en_exposure_classes: Array, //["en206.X0"],
//     application: {
//       fnd: false,
//       sog: false,
//       hrz: false,
//       vrt_wall: false,
//       vrt_column: false,
//       vrt_other: false,
//       sht: false,
//       cdf: false,
//       sac: false,
//       pav: false,
//       oil: false,
//       grt: false,
//       ota: false,
//     },
//     options: {
//       lightweight: false,
//       scc: false,
//       finishable: false,
//       air: false,
//       co2: false,
//       white: false,
//       plc: false,
//       fiber_reinforced: false,
//     },
//     cementitious: {
//       opc: 0.00, //0.123,
//       wht: 0.00, //0.123,
//       ggbs: 0.00, //0.045,
//       flyAsh: 0.00, //0.045,
//       siFume: 0.00, //0.045,
//       gg45: 0.00, //0.045,
//       natPoz: 0.00, //0.045,
//       mk: 0.00, //0.045,
//       CaCO3: 0.00, //0.045,
//       other: 0.00, //0.045,
//     },
//   },
// };

//"us_epa":{
//     "allocation_approach_disc": "",
//     "background_reporting_period_start": null,
//     "batch_specific": false,
//     "certificate_commitment_pledge_end": null,
//     "certificate_commitment_verification_link": null,
//     "comparability_statement": "",
//     "contains_regulated_hazardous_substance": true,
//     "dangerous_substance_release": true,
//     "dangerous_substance_released_list": [],
//     "data_collection_method_disc": "",
//     "eac_claims_verification_end_date": null,
//     "eac_claims_verifier": null,
//     "eac_claims_verifier_email": null,
//     "energy_attribute_fraction": 0,
//     "energy_attribute_power_types": null,
//     "eol_modeling_approach_disc": "",
//     "epa_human_readable_id": "",
//     "epd_generator": {
//         "link": "",
//         "name": "",
//         "owner": {
//             "web_domain": ""
//         },
//         "primary_function": "",
//         "uuid": "",
//         "version": ""
//     },
//     "ext_version": "",
//     "grid_granularity": "",
//     "grid_mix_accounting": "",
//     "hazardous_substance_included_list": [],
//     "hazardous_substance_standards": "",
//     "lca_software": {
//         "link": "",
//         "name": "",
//         "owner": {
//             "web_domain": ""
//         },
//         "primary_function": "",
//         "uuid": "",
//         "version": ""
//     },
//     "lca_system_boundary_disc": "",
//     "lci_cutoff_criteria_disc": "",
//     "lci_databases": [
//         {
//             "link": "",
//             "name": "",
//             "owner": {
//                 "web_domain": ""
//             },
//             "uuid": "",
//             "version": ""
//         }
//     ],
//     "manufacturer_specific": true,
//     "plant_specific": true,
//     "primary_reporting_period_end": "",
//     "primary_reporting_period_start": "",
//     "product_specific": true,
//     "supply_chain_specificity": null
// }
