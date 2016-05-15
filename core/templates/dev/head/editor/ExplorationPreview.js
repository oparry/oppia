// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Controllers and services for the exploration preview in the
 * editor page.
 */

oppia.controller('ExplorationPreview', [
  '$scope', '$timeout', 'LearnerParamsService', '$modal',
  'explorationData', 'editorContextService',
  'explorationStatesService', 'explorationInitStateNameService',
  'explorationParamSpecsService', 'explorationTitleService',
  'explorationCategoryService', 'explorationParamChangesService',
  'explorationGadgetsService', 'oppiaPlayerService', 'parameterMetadataService',
  function(
      $scope, $timeout, LearnerParamsService, $modal,
      explorationData, editorContextService,
      explorationStatesService, explorationInitStateNameService,
      explorationParamSpecsService, explorationTitleService,
      explorationCategoryService, explorationParamChangesService,
      explorationGadgetsService, oppiaPlayerService, parameterMetadataService) {
    $scope.isExplorationPopulated = false;
    explorationData.getData().then(function() {
      var initStateNameForPreview = editorContextService.getActiveStateName();

      // Show a warning message if preview doesn't start from the first state
      if (initStateNameForPreview !==
          explorationInitStateNameService.savedMemento) {
        $scope.previewWarning = 'Preview started from \"' +
          initStateNameForPreview + '\"';

        // Use parameterMetadataService to identify all of
        // the parameters that need to be set in this state
        var getParametersToSet = function(stateNames) {
          var unsetParametersInfo =
            parameterMetadataService.getUnsetParametersInfo(stateNames);
          var parametersToSet = [];
          for (var i = 0; i < unsetParametersInfo.length; i++) {
            parametersToSet.push({
              name: unsetParametersInfo[i].paramName,
              value: null
            });
          }
          return parametersToSet;
        };

        $scope.loadPreviewState(initStateNameForPreview);
        var parametersToSet = getParametersToSet([initStateNameForPreview]);
        if (parametersToSet) {
          $scope.showSetUndefinedParamsModal(parametersToSet, function() {
            $scope.loadPreviewState(initStateNameForPreview);
          });
        };
      } else {
        $scope.previewWarning = '';
      };
    });

    $scope.loadPreviewState = function(stateName) {
      // There is a race condition here that can sometimes occur when the editor
      // preview tab is loaded: the exploration in PlayerServices is populated,
      // but with null values for the category, init_state_name, etc. fields,
      // presumably because the various exploration property services have not
      // yet been updated. The timeout alleviates this.
      // TODO(sll): Refactor the editor frontend to create a single place for
      // obtaining the current version of the exploration, so that the use of
      // $timeout isn't necessary.
      console.log('Loading preview state ' + stateName);
      $timeout(function() {
        oppiaPlayerService.populateExploration({
          category: explorationCategoryService.savedMemento,
          init_state_name: stateName,
          param_changes: explorationParamChangesService.savedMemento,
          param_specs: explorationParamSpecsService.savedMemento,
          states: explorationStatesService.getStates(),
          title: explorationTitleService.savedMemento,
          skin_customizations: {
            panels_contents: explorationGadgetsService.getPanelsContents()
          }
        });
        $scope.isExplorationPopulated = true;
      }, 600);
      console.log('State loaded.');
    };

    $scope.$on('updateActiveState', function(evt, stateName) {
      editorContextService.setActiveStateName(stateName);
    });

    $scope.allParams = {};
    $scope.$on('playerStateChange', function() {
      $scope.allParams = LearnerParamsService.getAllParams();
    });

    $scope.showSetUndefinedParamsModal = function(parametersToSet, callback) {
      var modalInstance = $modal.open({
        templateUrl: 'modals/previewParams',
        backdrop: 'static',
        controller: [
          '$scope', '$modalInstance', function($scope, $modalInstance) {
            $scope.parametersToSet = parametersToSet;
            $scope.previewParamModalOk = $modalInstance.close;
            $scope.previewParamModalCancel = function() {
              $modalInstance.dismiss('cancel');
            };
          }
        ],
        windowClass: 'oppia-preview-params-modal'
      }).result.then(function() {
        for (var i = 0; i < parametersToSet.length; i++) {
          console.log('Setting param ' + parametersToSet[i].name);
          LearnerParamsService.setValue(parametersToSet[i].name,
                                        parametersToSet[i].value);
          console.log(parametersToSet[i].name + ' set  to ' +
                      LearnerParamsService.getValue(parametersToSet[i].name));
        }
        $scope.allParams = LearnerParamsService.getAllParams();
        if (callback) {
          callback();
        }
      });
    };
  }
]);
