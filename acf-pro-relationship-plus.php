<?php
/*
Plugin Name: Quick and easy Post creation for ACF Relationship Fields PRO
Description: Quick & Easy post creation on your Advanced Custom Fields (ACF) Relationship Fields (PRO version)
Author: ED. Digital
Version: 3.2
Author URI: https://ed.com.au
*/

if (!class_exists('ACF_Relationship_Create_Pro')) {

  add_action(
    'admin_bar_menu',
    function ($admin_bar) {
      $args = array(
        'parent' => 'site-name',
        'id'     => 'media-libray',
        'title'  => 'Media Library',
        'href'   => '#create-new-post-alerts',
        'meta'   => false
    );
    $admin_bar->add_node( $args );  
    },
    999
  );

  add_action(
    'wp_ajax_acf_pro_relationship_plus_submit',
    function () {
      $title = @$_POST['title'];
      $type = @$_POST['type'];

      if (!$title) {
        echo json_encode([
          'error' => true,
          'message' => "Missing 'title'"
        ]);
        wp_die();
      }

      if (!$type) {
        echo json_encode([
          'error' => true,
          'message' => "Missing 'type'"
        ]);
        wp_die();
      }

      $post = wp_insert_post([
        'post_title' => $title,
        'post_type' => $type
      ]);

      echo json_encode([
        'error' => false,
        'data' => array_merge(
          (array)get_post($post), 
          [
            'url' => get_the_permalink($post)
          ]
        )
      ]);

      wp_die();

      

      // return $post;
  });


  class ACF_Relationship_Create_Pro
  {

    private static $_instance;

    /**
     * Singleton pattern
     * @return ACF_Relationship_Create_Pro
     */
    public static function getInstance()
    {
      if (self::$_instance instanceof self) return self::$_instance;
      self::$_instance = new self();
      return self::$_instance;
    }

    /**
     * Avoid creation of an instance from outside
     */
    private function __clone()
    {
    }


    /**
     * Private constructor (part of singleton pattern)
     * Declare WordPress Hooks
     */
    private function __construct()
    {

      // Load the plugin's translated strings
      add_action('plugins_loaded', array($this, 'load_text_domain'));

      // Init
      add_action(
        'init',
        array($this, 'init'),
        6 // Right after ACF
      );
    }

    /**
     * Load the plugin's translated strings
     *
     * @hook action plugins_loaded
     */
    public function load_text_domain()
    {
      load_plugin_textdomain('acf-relationship-create', false, plugin_basename(dirname(__FILE__)) . '/languages');
    }

    /**
     * Check if ACF is installed
     *
     * @return bool
     */
    public static function is_acf_installed()
    {
      return (class_exists('acf') || class_exists('ACF'));
    }

    /**
     * Check if ACF version is PRO
     *
     * @return bool
     */
    public static function is_acf_pro_version()
    {
      return class_exists('acf_pro');
    }

    /**
     * Admin notice if ACF version isn't PRO
     *
     * @hook action admin_notices
     * @see ACF_Relationship_Create_Free::register_assets
     */
    public function admin_notice_bad_ACF_version()
    {
?>
      <div class="notice notice-error is-dismissible">
        <p>
          <?php
          printf(
            __('You are using the free version of Advanced Custom Fields plugin. You have to downgrade `Advanced Custom Fields Relationship Create` plugin <a href="%s" target="_blank">to the FREE version</a> too!', 'acf-relationship-create'),
            'https://wordpress.org/plugins/quick-and-easy-post-creation-for-acf-relationship-fields/'
          );
          ?>
        </p>
      </div>
    <?php
    }

    /**
     * Init method, called right after ACF
     *
     * @hook action init
     */
    public function init()
    {

      // Stop here if ACF isn't installed
      if (!self::is_acf_installed())
        return;

      // Bail early with an error notice if ACF version isn't PRO
      if (!self::is_acf_pro_version()) {
        add_action('admin_notices', array($this, 'admin_notice_bad_ACF_version'));
        return;
      }



      /**
       * Register scripts
       */

      wp_register_script(
        'acf-pro-relationship-plus',
        plugins_url('dist/index.js', __FILE__),
        array('jquery'),
      );

      /**
       * Admin enqueue scripts
       */
      add_action(
        'admin_enqueue_scripts',
        array($this, 'admin_scripts'),
        11 // Right after ACF
      );


      /**
       * ACF Hooks
       */

      // Enqueue assets for ACF fields
      add_action('acf/input/admin_enqueue_scripts', array($this, 'enqueue_acf_assets'), 11); // Just after ACF scripts

      // Alter query params for AJAX calls on ACF Relationship fields
      add_filter('acf/fields/relationship/query', array($this, 'acf_field_alter_ajax'), 10, 3);

      // Add new setting for ACF relationship fields
      add_action('acf/render_field_settings/type=relationship', array($this, 'acf_relationship_settings'), 50);
      add_action('acf/render_field_settings/type=post_object', array($this, 'acf_relationship_settings'), 50);

      // Alter markup of ACF relationship fields
      add_action('acf/render_field/type=relationship', array($this, 'acf_render_relationship_field'), 10, 1);
      add_action('acf/render_field/type=post_object', array($this, 'acf_render_relationship_field'), 10, 1);
    }

    public function isGutenbergEnabledOnCPT($post_type)
    {
      $post_type_object = get_post_type_object($post_type);
      if (empty($post_type_object))
        return false;

      if (!isset($post_type_object->show_in_rest) || $post_type_object->show_in_rest !== true)
        return false;

      if (!is_array($post_type_object->supports) || !in_array('editor', $post_type_object->supports))
        return false;

      return true;
    }

    /**
     * Include scripts
     *
     * @hook action admin_enqueue_scripts
     *
     * @param $hook
     */
    public function admin_scripts($hook)
    {
      $include_in = array('post.php');

      // Check if Gutenberg is enabled on this post type.
      // In this only case, post-new.php hook must be included.
      $current_screen = get_current_screen();
      if (!empty($current_screen->post_type) && $this->isGutenbergEnabledOnCPT($current_screen->post_type)) {
        $include_in[] = 'post-new.php';
      }

      if (in_array($hook, $include_in)) {
        wp_enqueue_script('acf-pro-relationship-plus');
      }
    }

    /**
     * Enqueue assets for ACF fields
     *
     * @hook action acf/input/admin_enqueue_scripts
     */
    public function enqueue_acf_assets()
    {

      include_once(ABSPATH . WPINC . '/version.php');
      global $wp_version;

      wp_enqueue_script('acf-pro-relationship-plus');
    }

    /**
     * Alter query params for AJAX calls on ACF Relationship fields
     *
     * @hook filter acf/fields/relationship/query
     *
     * @param $args
     * @param $field
     * @param $post_id
     * @return mixed
     */
    public function acf_field_alter_ajax($args, $field, $post_id)
    {
      if (empty($_POST['acf_relationship_created_post_id'])) return $args;

      $post_params = explode('-', $_POST['acf_relationship_created_post_id']);

      $created_post_id = absint($post_params[0]);
      if (empty($created_post_id)) return $args;

      if (!empty($args['post_type'])) {
        // We're only looking for this particular post ID
        $args['p'] = $created_post_id;
        unset($args['s']);
        unset($args['tax_query']);
      }

      return $args;
    }

    /**
     * Alter markup of ACF relationship fields
     *
     * @hook action acf/render_field/type=relationship
     *
     * @param $field
     */
    public function acf_render_relationship_field($field)
    {
      /* Return early if this field is not enabled */
      if (empty($field['acf_relationship_create'])) return;

      $post_types = empty($field['post_type']) ? acf_get_post_types() : $field['post_type'];

      $all_custom_post_types = array_filter(get_post_types(), function ($item) {
        return in_array($item, ["attachment","nav_menu_item","customize_changeset","revision"]);
      });

    ?>
      <script type="application/json" data-post-types>
        <?= json_encode($post_types); ?>
      </script>
      <script type="application/json" data-all-post-types>
        <?= json_encode($all_custom_post_types); ?>
      </script>

    <?php
    }

    /**
     * Add new setting for ACF relationship fields
     *
     * @hook action acf/render_field_settings/type=relationship
     * @hook action acf/render_field_settings/type=post_object
     *
     * @param $field
     */
    public function acf_relationship_settings($field)
    {
      acf_render_field_wrap(array(
        'label'      => 'Enable creating content on the fly?',
        'instructions'  => '',
        'type'      => 'radio',
        'name'      => 'acf_relationship_create',
        'prefix'    => $field['prefix'],
        'value'      => $field['acf_relationship_create'],
        'choices'    => array(
          0        => __("No", 'acf'),
          1        => __("Yes", 'acf'),
        ),
        'layout'    => 'horizontal',
        'class'      => 'field-acf_relationship_create'
      ), 'tr');
    }
  }

  ACF_Relationship_Create_Pro::getInstance();
}
