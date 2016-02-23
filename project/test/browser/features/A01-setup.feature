Feature: Basic Functionality

  Scenario: Homepage is rendered on the server with dehydrated state
    Given I run this command:
      """
      curl --insecure https://localhost:10443/
      """
    Then the following is present in the output:
      """
          if (typeof window.history !== 'undefined') {
            window.jsErrors = [];
            window.onerror = function(errorMessage) {
              window.jsErrors.push(errorMessage);
            }
            var s = document.createElement('script');
            s.setAttribute( 'src', '/app.js');
            document.body.appendChild(s);
          }
        </script>
      </body>
      </html>
    """

  Scenario: Page 1 is rendered on the server with dehydrated state
    Given I run this command:
      """
      curl --insecure https://localhost:10443/page/page-1
      """
    Then the following is present in the output:
      """
      Page 1 Howler monkeys in Mexico
      """

  Scenario: Homepage rehydrates from the dehydrated state
    When I navigate to /
    Then the state key '["config"]' is the JSON:
    """
    {"path":"/","method":"get","Component":"Home"}
    """
    And the state key '["loading"]' is the JSON:
    """
    {"expected":0,"progress":1}
    """
    And the history is:
    """
    ["/"]
    """
    And no errors are present
    And 'Hi' is visible in '#hi'

  Scenario: Navigate from the hydrated state to Page 1
    Given I navigate to /
    And no errors are present
    When I follow the 'Hi' link
    Then the browser moves to /page/page-1
    And no errors are present
    And 'Page 1 Howler monkeys in Mexico' is visible in '#title'
    And the history is:
    """
    ["/", "/page/page-1"]
    """
    And the state key '["config", "Component"]' is 'Page'
    And the state key '["loading"]' is the JSON:
    """
    {"load": {"page": {"expected": 1, "obtained": 1}}, "expected": 1, "progress": 1}
    """

  Scenario: Go back
    When I go back
    Then the browser moves to /
    And no errors are present
    And the history is:
    """
    ["/", "/page/page-1", "/"]
    """
    And the state key '["config"]' is the JSON:
    """
    {"path":"/","method":"get","Component":"Home"}
    """
    And the state key '["loading"]' is the JSON:
    """
    {"expected":0,"progress":1}
    """
    And 'Hi' is visible in '#hi'

  Scenario: Go forward
    When I go forward
    Then the browser moves to /page/page-1
    And no errors are present
    And the history is:
    """
    ["/", "/page/page-1", "/", "/page/page-1"]
    """
    And 'Page 1 Howler monkeys in Mexico' is visible in '#title'
    And the state key '["config", "Component"]' is 'Page'
    And the state key '["loading"]' is the JSON:
    """
    {"load": {"page": {"expected": 1, "obtained": 1}}, "expected": 1, "progress": 1}
    """
