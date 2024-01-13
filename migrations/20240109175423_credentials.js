exports.up = function (knex) {
  return knex.schema
    .raw('DROP TABLE IF EXISTS credentials')
    .then(() => {
      return knex.schema.createTable('credentials', function (table) {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('service_id').notNullable();
        table.text('value', 'longtext').notNullable();
      });
    });
};

exports.down = function (knex) {
  return knex.schema.dropTable('credentials');
};